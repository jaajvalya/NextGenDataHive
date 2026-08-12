"""Request bodies accepted by the API."""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, model_validator


class SqlQueryIn(BaseModel):
    sql: str = Field(..., min_length=1)
    max_rows: int = Field(default=1000, ge=1, le=10_000)
    schema: str | None = None
    table: str | None = None
    connector_id: str | None = None


class AskHistoryTurn(BaseModel):
    """One prior Ask turn so follow-ups can reuse context."""

    question: str = Field(..., min_length=1, max_length=2000)
    sql: str | None = Field(default=None, max_length=20_000)
    answer: str | None = Field(default=None, max_length=4000)
    connector_id: str | None = None
    sources: list[str] = Field(default_factory=list, max_length=12)


class AskSqlIn(BaseModel):
    """Generate SQL for a question without running it."""

    question: str = Field(..., min_length=3, max_length=2000)
    connector_id: str | None = None
    max_rows: int = Field(default=500, ge=1, le=10_000)
    history: list[AskHistoryTurn] = Field(default_factory=list, max_length=8)


class AskIn(AskSqlIn):
    """Generate and run, optionally with a written answer."""

    execute: bool = True
    explain_result: bool = True


class DataQualityRunIn(BaseModel):
    connector_id: str = Field(..., min_length=1)
    schema: str = Field(..., min_length=1)
    tables: list[str] = Field(..., min_length=1, max_length=12)


class ConnectionLogIn(BaseModel):
    user: str | None = None
    message: str = Field(..., min_length=1)
    event: str = "connection.error"
    outcome: str = "failure"
    error_type: str | None = "client"
    context: dict[str, Any] | None = None

    @model_validator(mode="after")
    def _normalize_outcome(self) -> ConnectionLogIn:
        if self.outcome not in ("success", "failure"):
            self.outcome = "failure"
        if self.outcome == "success":
            self.error_type = None
        return self
