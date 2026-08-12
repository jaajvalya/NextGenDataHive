"""End-to-end cover for /api/ask with a scripted model.

The unit tests pin each stage in isolation; this one proves they are wired
together — that a question reaches the planner, that the connector is invoked
for column detail, and that only guard-approved SQL is executed. No network,
no database: the provider, the catalog and the executor are all stubbed.
"""
from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient

from api.main import app
from api.routers import ask as ask_router
from core.ai import context as ai_context
from core.ai import planner as ai_planner
from core.ai import provider as ai_provider

CATALOG = {
    "connectors": [
        {"id": "local-postgres", "display_name": "Local Postgres", "platform": "postgres"},
    ],
    "items": [
        {
            "name": "orders",
            "type": "Table",
            "schema": "silver",
            "database": "datahivepoc",
            "crumb": "silver.orders",
            "connector_id": "local-postgres",
            "connector_name": "Local Postgres",
            "platform": "postgres",
            "structure_supported": True,
        },
    ],
}

STRUCTURE = {
    "schema": "silver",
    "table": "orders",
    "columns": [
        {"name": "id", "type": "integer", "primary_key": True, "nullable": False},
        {"name": "ord_amt_usd", "type": "numeric", "nullable": True},
    ],
}

RESULT = {
    "columns": ["id", "ord_amt_usd"],
    "rows": [[1, 250.0], [2, 90.0]],
    "row_count": 2,
    "truncated": False,
    "max_rows": 500,
    "platform": "postgres",
    "connector_id": "local-postgres",
}


class ScriptedProvider:
    """Replays canned completions and records what it was asked."""

    name = "scripted"
    model = "test-model"

    def __init__(self, *responses: str):
        self.responses = list(responses)
        self.prompts: list[str] = []

    def complete(self, messages, *, json_mode=False, temperature=0.0):
        self.prompts.append("\n".join(m["content"] for m in messages))
        if not self.responses:
            raise AssertionError("the pipeline asked the model more times than expected")
        return self.responses.pop(0)


def plan_reply(tables, connector_id="local-postgres"):
    return json.dumps(
        {
            "answerable": True,
            "connector_id": connector_id,
            "tables": tables,
            "reason": "Orders holds the amounts.",
        }
    )


def sql_reply(sql, confidence="high"):
    return json.dumps(
        {
            "sql": sql,
            "explanation": "Sums order value.",
            "confidence": confidence,
            "assumptions": ["Amounts are already in USD."],
        }
    )


@pytest.fixture
def scripted(monkeypatch):
    """Install a scripted model and stub everything that would leave the process."""
    executed: dict[str, object] = {}
    holder: dict[str, ScriptedProvider] = {}

    def install(*responses: str):
        llm = ScriptedProvider(*responses)
        holder["llm"] = llm
        monkeypatch.setattr(ai_provider, "get_provider", lambda settings=None: llm)
        monkeypatch.setattr(ask_router.provider, "get_provider", lambda settings=None: llm)
        return llm

    settings = ai_provider.AISettings(
        provider="scripted",
        model="test-model",
        api_key="",
        base_url="",
        timeout=5.0,
        max_rows=500,
        send_results=True,
    )
    monkeypatch.setattr(ask_router.provider, "load_settings", lambda: settings)
    monkeypatch.setattr(ai_context, "_load_glossary", dict)
    monkeypatch.setattr(ai_context.asset_catalog, "build_catalog", lambda *a, **k: CATALOG)
    monkeypatch.setattr(
        ai_planner.asset_catalog, "connector_structure", lambda *a, **k: dict(STRUCTURE)
    )
    monkeypatch.setattr(ask_router.mongo_store, "append_query_log", lambda record: None)

    def fake_run_sql(user, role, sql, **kwargs):
        executed["sql"] = sql
        executed["kwargs"] = kwargs
        return dict(RESULT)

    monkeypatch.setattr(ask_router.sql_runner, "run_sql", fake_run_sql)
    ai_context.invalidate_cache()
    yield {"install": install, "executed": executed, "holder": holder}
    ai_context.invalidate_cache()


@pytest.fixture
def client():
    return TestClient(app)


def test_question_becomes_an_answered_query(scripted, client):
    scripted["install"](
        plan_reply(["silver.orders"]),
        sql_reply("SELECT id, ord_amt_usd FROM silver.orders ORDER BY ord_amt_usd DESC"),
        "The largest order is 250 USD.",
    )
    res = client.post("/api/ask", json={"question": "What is our largest order?"})
    assert res.status_code == 200

    body = res.json()
    assert body["executed"] is True
    assert body["answer"] == "The largest order is 250 USD."
    assert body["rows"] == RESULT["rows"]
    assert body["connector_id"] == "local-postgres"
    assert body["confidence"] == "high"
    assert [s["fqn"] for s in body["sources"]] == ["silver.orders"]
    # The guard appended the cap the model omitted.
    assert body["sql"].endswith("LIMIT 500")
    assert scripted["executed"]["sql"] == body["sql"]
    assert scripted["executed"]["kwargs"]["source"] == "ask"


def test_columns_are_fetched_only_for_the_planned_tables(scripted, client):
    llm = scripted["install"](
        plan_reply(["silver.orders"]),
        sql_reply("SELECT id FROM silver.orders"),
        "Two orders.",
    )
    client.post("/api/ask", json={"question": "list orders"})

    planning_prompt, generation_prompt = llm.prompts[0], llm.prompts[1]
    # Stage one sees table names only; stage two sees the columns.
    assert "silver.orders" in planning_prompt
    assert "ord_amt_usd" not in planning_prompt
    assert "ord_amt_usd numeric" in generation_prompt


def test_hallucinated_table_is_blocked_instead_of_executed(scripted, client):
    scripted["install"](
        plan_reply(["silver.orders"]),
        sql_reply("SELECT * FROM silver.revenue_summary"),
    )
    res = client.post("/api/ask", json={"question": "revenue summary"})
    assert res.status_code == 422
    assert "revenue_summary" in res.json()["detail"]
    assert "sql" not in scripted["executed"]


def test_generated_dml_is_blocked_instead_of_executed(scripted, client):
    scripted["install"](
        plan_reply(["silver.orders"]),
        sql_reply("DELETE FROM silver.orders"),
    )
    res = client.post("/api/ask", json={"question": "clear the orders table"})
    assert res.status_code == 422
    assert "sql" not in scripted["executed"]


def test_preview_generates_without_executing(scripted, client):
    scripted["install"](
        plan_reply(["silver.orders"]),
        sql_reply("SELECT id FROM silver.orders"),
    )
    res = client.post("/api/ask/sql", json={"question": "list orders"})
    assert res.status_code == 200
    assert res.json()["executed"] is False
    assert "sql" not in scripted["executed"]


def test_results_are_withheld_from_the_model_when_configured(scripted, monkeypatch, client):
    private = ai_provider.AISettings(
        provider="scripted",
        model="test-model",
        api_key="",
        base_url="",
        timeout=5.0,
        max_rows=500,
        send_results=False,
    )
    monkeypatch.setattr(ask_router.provider, "load_settings", lambda: private)
    scripted["install"](
        plan_reply(["silver.orders"]),
        sql_reply("SELECT id FROM silver.orders"),
    )
    body = client.post("/api/ask", json={"question": "list orders"}).json()
    assert body["rows"] == RESULT["rows"]
    assert body["answer"] == ""
    assert "DATAHIVE_AI_SEND_RESULTS" in body["answer_skipped"]


def test_unanswerable_question_is_reported_not_guessed(scripted, client):
    scripted["install"](
        json.dumps(
            {"answerable": False, "reason": "Nothing in the catalog tracks web traffic."}
        )
    )
    res = client.post("/api/ask", json={"question": "how many website visits yesterday?"})
    assert res.status_code == 422
    assert res.json()["detail"] == "Nothing in the catalog tracks web traffic."


def test_disabled_provider_returns_a_configuration_error(monkeypatch, client):
    def not_configured(settings=None):
        raise ai_provider.AINotConfigured("Set DATAHIVE_AI_PROVIDER in .env")

    monkeypatch.setattr(ask_router.provider, "get_provider", not_configured)
    monkeypatch.setattr(ask_router.mongo_store, "append_query_log", lambda record: None)
    res = client.post("/api/ask", json={"question": "anything at all"})
    assert res.status_code == 503
    assert "DATAHIVE_AI_PROVIDER" in res.json()["detail"]


def test_health_reports_whether_the_tab_should_appear(monkeypatch, client):
    monkeypatch.setattr(
        ask_router.provider, "provider_status", lambda: {"enabled": True, "model": "test-model"}
    )
    assert client.get("/api/ask/health").json()["enabled"] is True


def test_follow_up_history_is_injected_into_prompts(scripted, client):
    llm = scripted["install"](
        plan_reply(["silver.orders"]),
        sql_reply(
            "SELECT id, ord_amt_usd FROM silver.orders WHERE ord_amt_usd > 100 ORDER BY ord_amt_usd DESC"
        ),
        "Orders over 100.",
    )
    res = client.post(
        "/api/ask",
        json={
            # Longer follow-up still routes through the planner (not a chip shortcut).
            "question": "Only keep orders over 100 and sort by amount",
            "history": [
                {
                    "question": "What is our largest order?",
                    "sql": "SELECT id, ord_amt_usd FROM silver.orders ORDER BY ord_amt_usd DESC",
                    "answer": "The largest order is 250 USD.",
                    "connector_id": "local-postgres",
                    "sources": ["silver.orders"],
                }
            ],
        },
    )
    assert res.status_code == 200, res.text
    planning_prompt, generation_prompt = llm.prompts[0], llm.prompts[1]
    assert "Prior conversation" in planning_prompt
    assert "What is our largest order?" in planning_prompt
    assert "Prior conversation" in generation_prompt
    assert "follow-up" in generation_prompt.lower()
    assert "Resolved intent" in generation_prompt


def test_follow_up_recovers_when_model_calls_it_unanswerable(scripted, client):
    """Short chips like 'top 10' must not fail just because the planner refuses."""
    llm = scripted["install"](
        sql_reply(
            "SELECT id, ord_amt_usd FROM silver.orders ORDER BY ord_amt_usd DESC LIMIT 10"
        ),
        "Here are the top 10.",
    )
    res = client.post(
        "/api/ask",
        json={
            "question": "Show only the top 10",
            "history": [
                {
                    "question": "What is our largest order?",
                    "sql": "SELECT id, ord_amt_usd FROM silver.orders ORDER BY ord_amt_usd DESC LIMIT 500",
                    "answer": "The largest order is 250 USD.",
                    "connector_id": "local-postgres",
                    "sources": ["silver.orders"],
                }
            ],
        },
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["executed"] is True
    assert "LIMIT 10" in body["sql"]
    # Expanded using prior intent; planner skipped because it is a short follow-up.
    assert "largest order" in body["question"].lower()
    assert len(llm.prompts) == 2  # nl2sql + answer; no planner call


def test_chart_that_follow_up_is_expanded_and_skips_planner(scripted, client):
    llm = scripted["install"](
        sql_reply(
            "SELECT id, ord_amt_usd FROM silver.orders ORDER BY ord_amt_usd DESC LIMIT 500"
        ),
        "Chart-ready totals.",
    )
    res = client.post(
        "/api/ask",
        json={
            "question": "Chart that",
            "history": [
                {
                    "question": "Sum of orders per quarter",
                    "sql": "SELECT id, ord_amt_usd FROM silver.orders",
                    "connector_id": "local-postgres",
                    "sources": ["silver.orders"],
                }
            ],
        },
    )
    assert res.status_code == 200, res.text
    assert "Chart the result" in res.json()["question"]
    assert "Sum of orders per quarter" in res.json()["question"]
    assert len(llm.prompts) == 2


def test_filter_last_90_days_follow_up_never_refused(scripted, client):
    llm = scripted["install"](
        sql_reply(
            "SELECT id, ord_amt_usd FROM silver.orders "
            "WHERE order_date >= CURRENT_DATE - INTERVAL '90 days' LIMIT 500"
        ),
        "Orders from the last 90 days.",
    )
    res = client.post(
        "/api/ask",
        json={
            "question": "Filter to the last 90 days",
            "history": [
                {
                    "question": "Which customers have the highest total order value?",
                    "sql": "SELECT id, ord_amt_usd FROM silver.orders",
                    "connector_id": "local-postgres",
                    "sources": ["silver.orders"],
                }
            ],
        },
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert "90 days" in body["question"]
    assert "highest total order value" in body["question"].lower()
    assert "underspecified" not in (body.get("selection_reason") or "").lower()
    assert len(llm.prompts) == 2  # no planner call
