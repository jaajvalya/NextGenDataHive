"""Schema context for the model: what tables exist, and what the words mean.

Stage one of the Ask Aura pipeline sends only connector / schema / table names so
the prompt stays small on a large catalog. Column detail is fetched later, for
the handful of tables the planner selects.

Business vocabulary comes from `asset_glossary`, which is what lets a question
about "revenue" find a column actually named `ORD_AMT_USD`.
"""
from __future__ import annotations

import logging
import os
import re
import threading
import time
from dataclasses import dataclass, field
from typing import Any

from .. import asset_catalog, mongo_store
from ..config import load_repo_dotenv

_log = logging.getLogger("datahive.ai.context")

# Only these can actually run generated SQL today; see api/services/sql_runner.py.
QUERYABLE_PLATFORMS = frozenset({"postgres", "snowflake"})

# Types in the unified catalog that are not SQL-addressable tables.
_NON_TABLE_TYPES = frozenset({"Schema", "API", "Scope", "File"})

DEFAULT_MAX_TABLES = 120
DEFAULT_MAX_COLUMNS = 60
_MAX_GLOSSARY_TERMS = 2000

_TOKEN = re.compile(r"[a-z0-9]+")
_STOPWORDS = frozenset(
    {
        "a", "all", "an", "and", "any", "are", "as", "at", "average", "avg", "be",
        "by", "count", "did", "do", "does", "each", "every", "for", "from", "get",
        "give", "how", "in", "is", "it", "list", "many", "me", "much", "my", "of",
        "on", "or", "per", "show", "sum", "that", "the", "their", "there", "this",
        "to", "top", "total", "us", "was", "we", "were", "what", "when", "where",
        "which", "who", "why", "with",
    }
)


def _cache_ttl() -> float:
    load_repo_dotenv()
    try:
        return float(os.environ.get("DATAHIVE_AI_CATALOG_TTL") or 120.0)
    except ValueError:
        return 120.0


def tokenize(text: str) -> set[str]:
    """Lowercase alphanumeric tokens, minus stopwords, with a crude de-pluralise."""
    tokens: set[str] = set()
    for raw in _TOKEN.findall((text or "").lower()):
        if raw in _STOPWORDS or len(raw) < 2:
            continue
        tokens.add(raw)
        if len(raw) > 3 and raw.endswith("s") and not raw.endswith("ss"):
            tokens.add(raw[:-1])
    return tokens


# A part can stay unquoted only if it is already in the platform's natural case
# and holds nothing but identifier characters. Postgres folds to lower, Snowflake
# to upper, so `dhpoc-bronze` and a lower-case Snowflake name both need quotes.
_BARE_LOWER = re.compile(r"^[a-z_][a-z0-9_$]*$")
_BARE_UPPER = re.compile(r"^[A-Z_][A-Z0-9_$]*$")


def quote_part(part: str, platform: str) -> str:
    bare = _BARE_UPPER if (platform or "").lower() == "snowflake" else _BARE_LOWER
    if bare.match(part or ""):
        return part
    return '"' + (part or "").replace('"', '""') + '"'


@dataclass(frozen=True)
class TableRef:
    connector_id: str
    connector_name: str
    platform: str
    database: str
    schema: str
    table: str
    asset_type: str
    fqn: str
    queryable: bool
    terms: tuple[str, ...] = ()

    @property
    def key(self) -> str:
        return f"{self.schema}|{self.table}".lower()

    @property
    def sql_ref(self) -> str:
        """`fqn` rendered with the quoting the platform requires."""
        return ".".join(quote_part(p, self.platform) for p in self.fqn.split(".") if p)


@dataclass
class CatalogIndex:
    connectors: list[dict[str, Any]] = field(default_factory=list)
    tables: list[TableRef] = field(default_factory=list)
    glossary: dict[str, list[dict[str, Any]]] = field(default_factory=dict)
    built_at: float = 0.0

    def queryable_tables(self) -> list[TableRef]:
        return [t for t in self.tables if t.queryable]

    def connector(self, connector_id: str) -> dict[str, Any] | None:
        for c in self.connectors:
            if c["id"] == connector_id:
                return c
        return None

    def find(self, schema: str, table: str) -> TableRef | None:
        want = f"{(schema or '').strip()}|{(table or '').strip()}".lower()
        for t in self.tables:
            if t.key == want:
                return t
        return None

    def terms_for(self, schema: str, table: str) -> list[dict[str, Any]]:
        return self.glossary.get(f"{(schema or '').strip()}|{(table or '').strip()}".lower(), [])


_cache: dict[tuple[str, str, str], CatalogIndex] = {}
_cache_lock = threading.Lock()


def invalidate_cache() -> None:
    with _cache_lock:
        _cache.clear()


def _load_glossary() -> dict[str, list[dict[str, Any]]]:
    """Index every glossary term by schema|table (matched case-insensitively)."""
    index: dict[str, list[dict[str, Any]]] = {}
    try:
        cursor = mongo_store.asset_glossary_collection().find(
            {},
            {
                "schema": 1,
                "table": 1,
                "column": 1,
                "business_name": 1,
                "description": 1,
                "business_definition": 1,
            },
        ).limit(_MAX_GLOSSARY_TERMS)
    except Exception as exc:
        _log.warning("glossary load for AI context failed: %s", exc)
        return index

    for doc in cursor:
        schema = str(doc.get("schema") or "").strip()
        table = str(doc.get("table") or "").strip()
        column = str(doc.get("column") or "").strip()
        if not schema or not table or not column:
            continue
        index.setdefault(f"{schema}|{table}".lower(), []).append(
            {
                "column": column,
                "business_name": str(doc.get("business_name") or "").strip(),
                "description": str(
                    doc.get("description") or doc.get("business_definition") or ""
                ).strip(),
            }
        )
    return index


def _table_refs(
    catalog: dict[str, Any], glossary: dict[str, list[dict[str, Any]]]
) -> list[TableRef]:
    refs: list[TableRef] = []
    for item in catalog.get("items") or []:
        asset_type = str(item.get("type") or "Table")
        name = str(item.get("name") or "").strip()
        schema = str(item.get("schema") or "").strip()
        if not name or not schema or asset_type in _NON_TABLE_TYPES:
            continue
        if name == "snowflake_catalog_error":
            continue

        connector_id = str(item.get("connector_id") or "")
        platform = str(item.get("platform") or item.get("cloud") or "").lower()
        database = str(item.get("database") or "").strip()
        # Built from schema + name, never from `crumb`: on Postgres the crumb is a
        # display breadcrumb joined by an arrow glyph, not a usable table name.
        # Snowflake needs all three parts, and the catalog supplies the schema
        # already prefixed on the live path but bare on the glossary path.
        qualified = schema
        if (
            platform == "snowflake"
            and database
            and not schema.lower().startswith(f"{database.lower()}.")
        ):
            qualified = f"{database}.{schema}"
        fqn = f"{qualified}.{name}"
        terms = glossary.get(f"{schema}|{name}".lower(), [])
        refs.append(
            TableRef(
                connector_id=connector_id,
                connector_name=str(item.get("connector_name") or ""),
                platform=platform,
                database=database,
                schema=schema,
                table=name,
                asset_type=asset_type,
                fqn=fqn,
                queryable=(
                    platform in QUERYABLE_PLATFORMS
                    and bool(item.get("structure_supported"))
                    and not connector_id.startswith("glossary:")
                ),
                terms=tuple(
                    t["business_name"] for t in terms if t.get("business_name")
                ),
            )
        )
    return refs


def build_index(
    user: str,
    *,
    role: str | None = None,
    connector_id: str | None = None,
    refresh: bool = False,
) -> CatalogIndex:
    """Catalog + glossary for one caller, cached briefly so repeat asks are cheap."""
    key = (user or "", role or "", connector_id or "all")
    ttl = _cache_ttl()
    now = time.monotonic()

    if not refresh and ttl > 0:
        with _cache_lock:
            cached = _cache.get(key)
        if cached and (now - cached.built_at) < ttl:
            return cached

    catalog = asset_catalog.build_catalog(user, role=role, connector_id=connector_id)
    glossary = _load_glossary()
    index = CatalogIndex(
        connectors=list(catalog.get("connectors") or []),
        tables=_table_refs(catalog, glossary),
        glossary=glossary,
        built_at=now,
    )
    with _cache_lock:
        _cache[key] = index
    return index


def rank_tables(
    index: CatalogIndex, question: str, *, limit: int = DEFAULT_MAX_TABLES
) -> list[TableRef]:
    """Most plausible tables first, so trimming a big catalog stays sensible."""
    wanted = tokenize(question)
    scored: list[tuple[int, int, TableRef]] = []
    for position, ref in enumerate(index.queryable_tables()):
        haystack = tokenize(f"{ref.table} {ref.schema} {' '.join(ref.terms)}")
        overlap = len(wanted & haystack)
        # Glossary-described tables edge out bare ones at equal overlap.
        bonus = 1 if ref.terms and overlap else 0
        scored.append((-(overlap + bonus), position, ref))
    scored.sort()
    return [ref for _, _, ref in scored[: max(1, limit)]]


def render_catalog_card(
    index: CatalogIndex,
    question: str,
    *,
    max_tables: int = DEFAULT_MAX_TABLES,
) -> str:
    """Stage-one context: connectors and table names, no columns."""
    lines: list[str] = ["## Connectors"]
    queryable_ids = {t.connector_id for t in index.queryable_tables()}
    for conn in index.connectors:
        platform = str(conn.get("platform") or conn.get("cloud") or "unknown")
        note = "can run SQL" if conn["id"] in queryable_ids else "catalog only, cannot run SQL"
        lines.append(
            f"- id={conn['id']} | name={conn.get('display_name')} | platform={platform} | {note}"
        )

    ranked = rank_tables(index, question, limit=max_tables)
    total = len(index.queryable_tables())
    lines.append("")
    lines.append(f"## Queryable tables ({len(ranked)} of {total} shown)")
    if not ranked:
        lines.append("- (none: no Postgres or Snowflake connector is reachable)")
    for ref in ranked:
        entry = (
            f"- {ref.sql_ref} [{ref.asset_type}] "
            f"connector={ref.connector_id} platform={ref.platform}"
        )
        if ref.terms:
            entry += f" | means: {', '.join(sorted(set(ref.terms))[:6])}"
        lines.append(entry)

    vocabulary = _render_vocabulary(index, question)
    if vocabulary:
        lines.append("")
        lines.append("## Business vocabulary")
        lines.extend(vocabulary)

    return "\n".join(lines)


def _render_vocabulary(index: CatalogIndex, question: str, *, limit: int = 25) -> list[str]:
    """Glossary entries whose wording overlaps the question."""
    wanted = tokenize(question)
    if not wanted:
        return []
    hits: list[str] = []
    seen: set[str] = set()
    for key, terms in index.glossary.items():
        schema, _, table = key.partition("|")
        for term in terms:
            label = term.get("business_name") or term.get("description") or ""
            if not label:
                continue
            if not (wanted & tokenize(f"{label} {term['column']}")):
                continue
            line = f"- \"{label}\" → {schema}.{table}.{term['column']}"
            if line in seen:
                continue
            seen.add(line)
            hits.append(line)
            if len(hits) >= limit:
                return hits
    return hits


def _structure_label(index: CatalogIndex, structure: dict[str, Any]) -> str:
    schema = str(structure.get("schema") or "")
    table = str(structure.get("table") or "")
    ref = index.find(schema, table)
    return ref.sql_ref if ref else f"{schema}.{table}"


def _column_names(structure: dict[str, Any]) -> set[str]:
    names: set[str] = set()
    for col in structure.get("columns") or []:
        name = str(col.get("name") or "").strip()
        if name:
            names.add(name.lower())
    return names


def _join_key_priority(column: str) -> int:
    """Lower is better — prefer explicit keys over generic shared names."""
    col = (column or "").lower()
    if col.endswith("_id") or col.endswith("_key") or col in {"id", "pk"}:
        return 0
    if col.endswith("id") and len(col) > 2:
        return 1
    if any(token in col for token in ("code", "number", "num", "sku")):
        return 2
    return 3


def _table_stem(name: str) -> str:
    """Rough singular stem so ORDERS_TBL / customers match CUSTOMER_ID."""
    text = re.sub(r"[^a-z0-9]+", "", (name or "").lower())
    for suffix in ("tbl", "table", "dim", "fact"):
        if text.endswith(suffix) and len(text) > len(suffix) + 2:
            text = text[: -len(suffix)]
    if text.endswith("ies") and len(text) > 4:
        return text[:-3] + "y"
    if text.endswith("ses") and len(text) > 4:
        return text[:-2]
    if text.endswith("s") and len(text) > 3:
        return text[:-1]
    return text


def infer_join_hints(
    index: CatalogIndex,
    structures: list[dict[str, Any]],
    *,
    max_hints: int = 12,
) -> list[str]:
    """Suggest ON clauses from shared / name-related columns across planned tables."""
    if len(structures) < 2:
        return []

    labeled = [
        (_structure_label(index, structure), _column_names(structure), structure)
        for structure in structures
    ]
    hints: list[tuple[int, str]] = []
    seen: set[str] = set()

    def add(priority: int, text: str) -> None:
        if text in seen:
            return
        seen.add(text)
        hints.append((priority, text))

    for i, (left_label, left_cols, left_struct) in enumerate(labeled):
        left_pks = {
            str(col.get("name") or "").lower()
            for col in (left_struct.get("columns") or [])
            if col.get("primary_key") and col.get("name")
        }
        left_stem = _table_stem(str(left_struct.get("table") or ""))
        for right_label, right_cols, right_struct in labeled[i + 1 :]:
            right_pks = {
                str(col.get("name") or "").lower()
                for col in (right_struct.get("columns") or [])
                if col.get("primary_key") and col.get("name")
            }
            right_stem = _table_stem(str(right_struct.get("table") or ""))
            shared = left_cols & right_cols
            for col in sorted(shared, key=_join_key_priority):
                priority = _join_key_priority(col)
                if col in left_pks or col in right_pks:
                    priority = 0
                add(priority, f"- {left_label}.{col} = {right_label}.{col}")

            # Soft match: orders.customer_id ↔ customers.id
            for col in sorted(left_cols):
                if not col.endswith("_id"):
                    continue
                stem = col[:-3]
                if stem and stem == right_stem and ("id" in right_cols or right_pks):
                    right_key = sorted(right_pks)[0] if right_pks else "id"
                    add(0, f"- {left_label}.{col} = {right_label}.{right_key}  (inferred)")
            for col in sorted(right_cols):
                if not col.endswith("_id"):
                    continue
                stem = col[:-3]
                if stem and stem == left_stem and ("id" in left_cols or left_pks):
                    left_key = sorted(left_pks)[0] if left_pks else "id"
                    add(0, f"- {right_label}.{col} = {left_label}.{left_key}  (inferred)")

    hints.sort(key=lambda item: (item[0], item[1]))
    return [text for _, text in hints[:max_hints]]


def render_table_details(
    index: CatalogIndex,
    structures: list[dict[str, Any]],
    *,
    max_columns: int = DEFAULT_MAX_COLUMNS,
) -> str:
    """Stage-two context: columns and types for the selected tables only."""
    blocks: list[str] = []
    for structure in structures:
        schema = str(structure.get("schema") or "")
        table = str(structure.get("table") or "")
        ref = index.find(schema, table)
        fqn = ref.sql_ref if ref else f"{schema}.{table}"
        terms = {
            t["column"].lower(): t for t in index.terms_for(schema, table) if t.get("column")
        }

        header = f"### {fqn}"
        if structure.get("comment"):
            header += f"  -- {structure['comment']}"
        lines = [header]

        columns = structure.get("columns") or []
        for col in columns[:max_columns]:
            name = str(col.get("name") or "")
            col_type = str(col.get("type") or "unknown")
            parts = [f"  {name} {col_type}"]
            if col.get("primary_key"):
                parts.append("PRIMARY KEY")
            if col.get("nullable") is False:
                parts.append("NOT NULL")
            meaning = terms.get(name.lower(), {})
            label = meaning.get("business_name") or meaning.get("description")
            if not label and isinstance(col.get("metadata"), dict):
                label = col["metadata"].get("business_name") or col["metadata"].get(
                    "description"
                )
            if label:
                parts.append(f"-- {label}")
            lines.append(" ".join(parts))
        if len(columns) > max_columns:
            lines.append(f"  -- ({len(columns) - max_columns} more columns omitted)")
        if not columns:
            lines.append("  -- (no column metadata available for this table)")
        blocks.append("\n".join(lines))

    body = "\n\n".join(blocks)
    join_hints = infer_join_hints(index, structures)
    if join_hints:
        body += "\n\n## Likely join keys\n" + "\n".join(join_hints)
    return body
