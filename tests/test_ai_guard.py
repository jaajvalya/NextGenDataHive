"""Generated SQL is machine-written, so the guard is the only thing keeping a
hallucinated table or a stray DML statement away from the database.
"""
from __future__ import annotations

import pytest

from core.ai import guard
from core.ai.context import TableRef
from core.ai.errors import UnsafeQueryError

ORDERS = TableRef(
    connector_id="local-postgres",
    connector_name="Local Postgres",
    platform="postgres",
    database="datahivepoc",
    schema="silver",
    table="orders",
    asset_type="Table",
    fqn="silver.orders",
    queryable=True,
)
CUSTOMERS = TableRef(
    connector_id="local-postgres",
    connector_name="Local Postgres",
    platform="postgres",
    database="datahivepoc",
    schema="silver",
    table="customers",
    asset_type="Table",
    fqn="silver.customers",
    queryable=True,
)
SF_ORDERS = TableRef(
    connector_id="abc123",
    connector_name="SFSALESDB",
    platform="snowflake",
    database="SALES_DB",
    schema="SALES_DB.RAW",
    table="ORDERS",
    asset_type="Table",
    fqn="SALES_DB.RAW.ORDERS",
    queryable=True,
)

TABLES = [ORDERS, CUSTOMERS]


@pytest.mark.parametrize(
    "sql",
    [
        "delete from silver.orders",
        "DROP TABLE silver.orders",
        "select 1; drop table silver.orders",
        "/* hidden */ update silver.orders set id = 1",
        "insert into silver.orders (id) values (1)",
    ],
)
def test_writes_are_blocked_before_execution(sql):
    with pytest.raises(UnsafeQueryError):
        guard.enforce(sql, TABLES, max_rows=100)


def test_unknown_table_is_rejected():
    with pytest.raises(UnsafeQueryError) as exc:
        guard.enforce("SELECT * FROM silver.invented_table", TABLES, max_rows=100)
    assert "invented_table" in str(exc.value)


def test_planned_tables_are_accepted():
    sql = guard.enforce(
        "SELECT o.id FROM silver.orders o JOIN silver.customers c ON c.id = o.customer_id",
        TABLES,
        max_rows=100,
    )
    assert "silver.orders" in sql


def test_bare_table_name_matches_a_planned_table():
    assert guard.enforce("SELECT * FROM orders", TABLES, max_rows=50)


def test_snowflake_three_part_name_is_accepted():
    sql = guard.enforce("SELECT * FROM SALES_DB.RAW.ORDERS", [SF_ORDERS], max_rows=25)
    assert "LIMIT 25" in sql


def test_cte_names_are_not_treated_as_unknown_tables():
    sql = guard.enforce(
        "WITH recent AS (SELECT * FROM silver.orders) SELECT * FROM recent",
        TABLES,
        max_rows=10,
    )
    assert "LIMIT 10" in sql


def test_quoted_identifiers_are_matched():
    assert guard.enforce('SELECT * FROM "silver"."orders"', TABLES, max_rows=10)


def test_schema_with_a_hyphen_survives_the_round_trip():
    """A hyphenated schema must be quoted in SQL and still recognised here."""
    hyphenated = TableRef(
        connector_id="local-postgres",
        connector_name="Local Postgres",
        platform="postgres",
        database="datahivepoc",
        schema="dhpoc-bronze",
        table="test_customer_tbl",
        asset_type="Table",
        fqn="dhpoc-bronze.test_customer_tbl",
        queryable=True,
    )
    sql = guard.enforce(
        f"SELECT COUNT(*) FROM {hyphenated.sql_ref}", [hyphenated], max_rows=10
    )
    assert '"dhpoc-bronze".test_customer_tbl' in sql


def test_row_cap_is_added_when_missing():
    assert guard.enforce("SELECT * FROM silver.orders", TABLES, max_rows=42).endswith("LIMIT 42")


def test_existing_limit_is_left_alone():
    sql = guard.enforce("SELECT * FROM silver.orders LIMIT 5", TABLES, max_rows=500)
    assert sql.count("LIMIT") == 1
    assert "LIMIT 5" in sql


def test_referenced_tables_ignores_comments():
    found = guard.referenced_tables("-- FROM silver.secret\nSELECT 1 FROM silver.orders")
    assert found == ["silver.orders"]
