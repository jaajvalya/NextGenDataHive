"""Failures raised by the Ask Aura pipeline.

AskError and its subclasses are ValueErrors so the API layer can map them to
422 with the message shown verbatim in the UI.

Provider errors are RuntimeErrors — the model is unavailable or misbehaving,
which surfaces as 502/503 rather than a bad question.
"""
from __future__ import annotations


class AskError(ValueError):
    """A question could not be turned into a safe, runnable query."""


class PlanningError(AskError):
    """No connector or table could be matched to the question."""


class GenerationError(AskError):
    """The model did not produce usable SQL."""


class UnsafeQueryError(AskError):
    """Generated SQL failed validation and was not executed."""


class AINotConfigured(RuntimeError):
    """No usable LLM provider is configured."""


class AIProviderError(RuntimeError):
    """The provider was reachable but the call failed."""
