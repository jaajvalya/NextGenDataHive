"""Prior turns must stay compact and usable in planner / NL2SQL prompts."""
from __future__ import annotations

from core.ai.history import (
    effective_question,
    expand_followup,
    is_followup_refinement,
    is_short_followup,
    render_history,
)


def test_render_history_includes_follow_up_guidance_and_sql():
    text = render_history(
        [
            {
                "question": "top customers by order value",
                "sql": "SELECT c.name, SUM(o.amt) FROM customers c JOIN orders o ON o.customer_id = c.id GROUP BY 1",
                "answer": "Alice leads with $12k.",
                "sources": ["silver.customers", "silver.orders"],
            }
        ]
    )
    assert "Prior conversation" in text
    assert "follow-up" in text.lower()
    assert "top customers by order value" in text
    assert "JOIN orders" in text
    assert "Alice leads" in text
    assert "silver.orders" in text


def test_effective_question_keeps_prior_entity_for_short_follow_ups():
    resolved = effective_question(
        "Show only the top 10",
        [{"question": "Which customers have the highest total order value?"}],
    )
    assert "highest total order value" in resolved
    assert "top 10" in resolved.lower()


def test_expand_chart_that_into_prior_question():
    history = [{"question": "Sum of orders per quarter from RAW"}]
    assert is_short_followup("Chart that")
    assert (
        expand_followup("Chart that", history)
        == "Sum of orders per quarter from RAW. Chart the result."
    )


def test_expand_filter_last_90_days():
    history = [{"question": "Which customers have the highest total order value?"}]
    assert is_short_followup("Filter to the last 90 days")
    assert (
        expand_followup("Filter to the last 90 days", history)
        == "Which customers have the highest total order value. Filter to the last 90 days."
    )


def test_expanded_filter_still_counts_as_followup_refinement():
    history = [{"question": "Which customers have the highest total order value?"}]
    expanded = expand_followup("Filter to the last 90 days", history)
    assert is_followup_refinement(expanded, history)
    assert not is_short_followup(expanded)


def test_render_history_empty():
    assert render_history([]) == ""
    assert render_history(None) == ""
