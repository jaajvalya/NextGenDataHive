"""Validation every generated query must survive before it touches a database.

Three checks, in order:
  1. the same read-only guard the SQL explorer uses, so no DML or statement stacking
  2. every referenced table must exist in the catalog, so a hallucinated name
     fails here rather than as a confusing database error
  3. a row cap, added when the model forgot one
"""
from __future__ import annotations

import re

from ..postgres_store import assert_readonly_sql
from .context import TableRef
from .errors import UnsafeQueryError

# FROM / JOIN followed by a possibly-quoted, possibly-dotted identifier.
_IDENT = r'(?:"[^"]+"|[A-Za-z_][\w$]*)'
_TABLE_REF = re.compile(
    rf"\b(?:FROM|JOIN)\s+({_IDENT}(?:\s*\.\s*{_IDENT}){{0,2}})",
    re.IGNORECASE,
)
_CTE_NAME = re.compile(rf"\b({_IDENT})\s+AS\s*\(", re.IGNORECASE)
_HAS_LIMIT = re.compile(r"\b(LIMIT\s+\d+|FETCH\s+FIRST)\b", re.IGNORECASE)
_STARTS_SELECT = re.compile(r"^\s*(SELECT|WITH)\b", re.IGNORECASE)
_SQL_COMMENT_BLOCK = re.compile(r"/\*.*?\*/", re.DOTALL)
_SQL_COMMENT_LINE = re.compile(r"--[^\n]*")


def _unquote(identifier: str) -> str:
    return re.sub(r"\s*\.\s*", ".", identifier.strip()).replace('"', "").lower()


def allowed_names(tables: list[TableRef]) -> set[str]:
    """Every spelling of a planned table that SQL may legitimately use."""
    names: set[str] = set()
    for ref in tables:
        names.add(ref.fqn.lower())
        names.add(_unquote(ref.sql_ref))
        names.add(f"{ref.schema}.{ref.table}".lower())
        names.add(ref.table.lower())
        if ref.database:
            names.add(f"{ref.database}.{ref.schema}.{ref.table}".lower())
    return names


def referenced_tables(sql: str) -> list[str]:
    """Table names read by the statement, ignoring comments."""
    normalized = _SQL_COMMENT_LINE.sub(" ", _SQL_COMMENT_BLOCK.sub(" ", sql or ""))
    return [_unquote(match.group(1)) for match in _TABLE_REF.finditer(normalized)]


def _cte_names(sql: str) -> set[str]:
    return {_unquote(match.group(1)) for match in _CTE_NAME.finditer(sql or "")}


def apply_row_cap(sql: str, max_rows: int) -> str:
    """Add a LIMIT when the model omitted one. EXPLAIN/VALUES are left alone."""
    if _HAS_LIMIT.search(sql) or not _STARTS_SELECT.match(sql):
        return sql
    return f"{sql.rstrip().rstrip(';')}\nLIMIT {max_rows}"


def enforce(sql: str, tables: list[TableRef], *, max_rows: int) -> str:
    """Return SQL that is safe to execute, or raise UnsafeQueryError."""
    try:
        statement = assert_readonly_sql(sql)
    except ValueError as exc:
        raise UnsafeQueryError(f"Generated SQL was blocked: {exc}") from exc

    known = allowed_names(tables)
    defined = _cte_names(statement)
    unknown = [
        name
        for name in referenced_tables(statement)
        if name not in known and name not in defined and name.rsplit(".", 1)[-1] not in defined
    ]
    if unknown:
        raise UnsafeQueryError(
            "Generated SQL referenced "
            + ", ".join(sorted(set(unknown)))
            + ", which is not in the catalog. Rephrase the question or pick the source manually."
        )

    return apply_row_cap(statement, max_rows)
