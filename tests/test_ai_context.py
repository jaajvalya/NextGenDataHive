"""The schema card is the model's entire view of the estate.

If it omits a table the question needs, or lists one that cannot run SQL, the
generated query is wrong before the model starts. Built from a fake catalog so
no database is touched.
"""
from __future__ import annotations

import pytest

from core.ai import context

CATALOG = {
    "connectors": [
        {"id": "local-postgres", "display_name": "Local Postgres", "platform": "postgres"},
        {"id": "sf1", "display_name": "SFSALESDB", "platform": "snowflake"},
        {"id": "s3a", "display_name": "Marketing S3", "platform": "aws"},
    ],
    "items": [
        {
            "name": "orders",
            "type": "Table",
            "schema": "silver",
            "database": "datahivepoc",
            # Postgres crumbs are display breadcrumbs, not SQL references.
            "crumb": "silver › orders",
            "connector_id": "local-postgres",
            "connector_name": "Local Postgres",
            "platform": "postgres",
            "structure_supported": True,
        },
        {
            "name": "customers",
            "type": "Table",
            "schema": "silver",
            "database": "datahivepoc",
            "crumb": "silver › customers",
            "connector_id": "local-postgres",
            "connector_name": "Local Postgres",
            "platform": "postgres",
            "structure_supported": True,
        },
        {
            "name": "test_customer_tbl",
            "type": "Table",
            "schema": "dhpoc-bronze",
            "database": "datahivepoc",
            "crumb": "dhpoc-bronze › test_customer_tbl",
            "connector_id": "local-postgres",
            "connector_name": "Local Postgres",
            "platform": "postgres",
            "structure_supported": True,
        },
        {
            # Live Snowflake discovery labels the schema DATABASE.SCHEMA.
            "name": "ORDERS",
            "type": "Table",
            "schema": "SALES_DB.RAW",
            "database": "SALES_DB",
            "crumb": "SALES_DB.RAW.ORDERS",
            "connector_id": "sf1",
            "connector_name": "SFSALESDB",
            "platform": "snowflake",
            "structure_supported": True,
        },
        {
            # Glossary-sourced Snowflake assets carry a bare schema instead.
            "name": "DH_POC_CUSTOMER_TBL",
            "type": "Table",
            "schema": "RAW",
            "database": "SALES_DB",
            "crumb": "SALES_DB.RAW.DH_POC_CUSTOMER_TBL",
            "connector_id": "sf1",
            "connector_name": "SFSALESDB",
            "platform": "snowflake",
            "structure_supported": True,
        },
        {
            "name": "campaign_exports",
            "type": "File",
            "schema": "uploads",
            "database": "",
            "crumb": "uploads/campaign_exports.csv",
            "connector_id": "s3a",
            "connector_name": "Marketing S3",
            "platform": "aws",
            "structure_supported": False,
        },
        {
            "name": "leads",
            "type": "Table",
            "schema": "marketing",
            "database": "",
            "crumb": "marketing.leads",
            "connector_id": "s3a",
            "connector_name": "Marketing S3",
            "platform": "aws",
            "structure_supported": False,
        },
    ],
}

GLOSSARY = {
    "silver|orders": [
        {"column": "ord_amt_usd", "business_name": "Revenue", "description": "Order value in USD"},
    ]
}


@pytest.fixture
def index(monkeypatch):
    monkeypatch.setattr(context, "_load_glossary", lambda: GLOSSARY)
    monkeypatch.setattr(
        context.asset_catalog, "build_catalog", lambda *a, **k: CATALOG
    )
    context.invalidate_cache()
    yield context.build_index("Admin", role="admin")
    context.invalidate_cache()


def test_only_postgres_and_snowflake_tables_are_queryable(index):
    assert {t.fqn for t in index.queryable_tables()} == {
        "silver.orders",
        "silver.customers",
        "dhpoc-bronze.test_customer_tbl",
        "SALES_DB.RAW.ORDERS",
        "SALES_DB.RAW.DH_POC_CUSTOMER_TBL",
    }


def test_snowflake_reference_is_always_three_parts(index):
    """A bare schema must still produce DATABASE.SCHEMA.TABLE, not a 2-part name."""
    ref = index.find("RAW", "DH_POC_CUSTOMER_TBL")
    assert ref.fqn == "SALES_DB.RAW.DH_POC_CUSTOMER_TBL"
    assert ref.sql_ref == "SALES_DB.RAW.DH_POC_CUSTOMER_TBL"
    # The already-prefixed path must not gain a duplicate database.
    assert index.find("SALES_DB.RAW", "ORDERS").fqn == "SALES_DB.RAW.ORDERS"


def test_non_table_assets_are_excluded(index):
    assert all(t.table != "campaign_exports" for t in index.tables)


def test_reference_is_built_from_schema_and_name_not_the_display_crumb(index):
    """Postgres crumbs join schema and table with an arrow glyph, not a dot;
    feeding that straight to SQL would be invalid."""
    assert index.find("silver", "orders").fqn == "silver.orders"
    assert index.find("SALES_DB.RAW", "ORDERS").fqn == "SALES_DB.RAW.ORDERS"
    assert "›" not in context.render_catalog_card(index, "orders")


def test_identifiers_needing_quotes_get_them(index):
    # A hyphen cannot survive unquoted in Postgres.
    assert index.find("dhpoc-bronze", "test_customer_tbl").sql_ref == (
        '"dhpoc-bronze".test_customer_tbl'
    )
    # Already in the platform's natural case, so no quoting noise.
    assert index.find("silver", "orders").sql_ref == "silver.orders"
    assert index.find("SALES_DB.RAW", "ORDERS").sql_ref == "SALES_DB.RAW.ORDERS"


def test_glossary_terms_attach_to_their_table(index):
    assert index.find("silver", "orders").terms == ("Revenue",)
    assert index.find("silver", "customers").terms == ()


def test_card_marks_connectors_that_cannot_run_sql(index):
    card = context.render_catalog_card(index, "how much revenue last quarter?")
    assert "id=local-postgres" in card and "can run SQL" in card
    assert "catalog only, cannot run SQL" in card


def test_card_maps_business_words_to_real_columns(index):
    card = context.render_catalog_card(index, "how much revenue did we make?")
    assert "silver.orders.ord_amt_usd" in card


def test_card_respects_the_table_budget(index):
    total = len(index.queryable_tables())
    card = context.render_catalog_card(index, "orders", max_tables=1)
    assert f"(1 of {total} shown)" in card


def test_ranking_puts_the_matching_table_first(index):
    ranked = context.rank_tables(index, "how many customers do we have?")
    assert ranked[0].table == "customers"


def test_table_details_render_columns_with_their_business_meaning(index):
    structure = {
        "schema": "silver",
        "table": "orders",
        "columns": [
            {"name": "id", "type": "integer", "primary_key": True, "nullable": False},
            {"name": "ord_amt_usd", "type": "numeric", "nullable": True},
        ],
    }
    details = context.render_table_details(index, [structure])
    assert "### silver.orders" in details
    assert "id integer PRIMARY KEY NOT NULL" in details
    assert "-- Revenue" in details


def test_table_details_cap_wide_tables(index):
    structure = {
        "schema": "silver",
        "table": "orders",
        "columns": [{"name": f"c{i}", "type": "text"} for i in range(10)],
    }
    details = context.render_table_details(index, [structure], max_columns=3)
    assert "7 more columns omitted" in details


def test_tokenize_drops_filler_and_singularises():
    tokens = context.tokenize("Show me the total orders by customers")
    assert "order" in tokens and "customer" in tokens
    assert "the" not in tokens and "show" not in tokens


def test_index_is_cached_between_calls(monkeypatch):
    calls = {"n": 0}

    def counting_build(*_a, **_k):
        calls["n"] += 1
        return CATALOG

    monkeypatch.setattr(context, "_load_glossary", lambda: {})
    monkeypatch.setattr(context.asset_catalog, "build_catalog", counting_build)
    context.invalidate_cache()
    try:
        context.build_index("Admin", role="admin")
        context.build_index("Admin", role="admin")
        assert calls["n"] == 1
        context.build_index("Admin", role="admin", refresh=True)
        assert calls["n"] == 2
    finally:
        context.invalidate_cache()
