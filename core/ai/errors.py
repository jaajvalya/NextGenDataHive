"""Failures the caller can act on.

Everything raised here is a ValueError so the API layer maps the whole Ask Aura
pipeline to 422 with the message shown verbatim in the UI.
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
