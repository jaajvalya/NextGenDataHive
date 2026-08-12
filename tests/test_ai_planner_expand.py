"""Planner should pull join partners when the question names multiple entities."""
from __future__ import annotations

from core.ai.context import TableRef
from core.ai.planner import _expand_related_tables, _tables_from_history


def _ref(table: str, schema: str = "silver", connector_id: str = "pg") -> TableRef:
    return TableRef(
        connector_id=connector_id,
        connector_name="Local",
        platform="postgres",
        database="db",
        schema=schema,
        table=table,
        asset_type="Table",
        fqn=f"{schema}.{table}",
        queryable=True,
        terms=(),
    )


def test_expand_adds_customers_when_question_mentions_them():
    orders = _ref("orders")
    customers = _ref("customers")
    products = _ref("products")
    pool = [orders, customers, products]
    expanded = _expand_related_tables(
        "Which customers have the highest total order value?",
        [orders],
        pool,
    )
    assert orders in expanded
    assert customers in expanded
    assert products not in expanded


def test_expand_keeps_multi_table_selection():
    orders = _ref("orders")
    customers = _ref("customers")
    expanded = _expand_related_tables(
        "top customers by orders",
        [orders, customers],
        [orders, customers, _ref("products")],
    )
    assert expanded == [orders, customers]


def test_tables_recovered_from_prior_sql_for_follow_ups():
    orders = _ref("orders")
    customers = _ref("customers")
    pool = [orders, customers, _ref("products")]
    recovered = _tables_from_history(
        [
            {
                "question": "highest order value by customer",
                "sql": (
                    'SELECT c.name, SUM(o.ord_amt_usd) FROM silver.customers c '
                    "JOIN silver.orders o ON o.customer_id = c.id GROUP BY 1"
                ),
                "sources": ["silver.customers", "silver.orders"],
            }
        ],
        pool,
    )
    assert orders in recovered
    assert customers in recovered
