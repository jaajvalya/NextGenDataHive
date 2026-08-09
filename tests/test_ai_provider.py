"""Provider selection decides whether question text and schema names leave the
machine, so the env resolution is pinned here. Nothing in this module calls out.
"""
from __future__ import annotations

import pytest

from core.ai import provider

_AI_ENV = (
    "DATAHIVE_AI_PROVIDER",
    "DATAHIVE_AI_MODEL",
    "DATAHIVE_AI_API_KEY",
    "DATAHIVE_AI_BASE_URL",
    "DATAHIVE_AI_TIMEOUT",
    "DATAHIVE_AI_MAX_ROWS",
    "DATAHIVE_AI_SEND_RESULTS",
    "OPENAI_API_KEY",
    "GOOGLE_API_KEY",
    "GEMINI_API_KEY",
)


@pytest.fixture(autouse=True)
def clean_ai_env(monkeypatch):
    """A developer's real .env must not decide the outcome of these tests."""
    for name in _AI_ENV:
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setattr(provider, "load_repo_dotenv", lambda: None)


def test_auto_prefers_openai_when_a_key_is_present(monkeypatch):
    monkeypatch.setenv("DATAHIVE_AI_API_KEY", "sk-test")
    settings = provider.load_settings()
    assert settings.provider == "openai"
    assert isinstance(provider.get_provider(settings), provider.OpenAIProvider)


def test_auto_disables_the_feature_without_a_key():
    """An unset provider must hide the tab, not point at a daemon that may be absent."""
    settings = provider.load_settings()
    assert settings.provider == "none"
    with pytest.raises(provider.AINotConfigured):
        provider.get_provider(settings)


def test_local_ollama_is_opt_in(monkeypatch):
    monkeypatch.setenv("DATAHIVE_AI_PROVIDER", "ollama")
    settings = provider.load_settings()
    assert settings.provider == "ollama"
    assert isinstance(provider.get_provider(settings), provider.OllamaProvider)


def test_google_gemma_provider_is_opt_in(monkeypatch):
    monkeypatch.setenv("DATAHIVE_AI_PROVIDER", "gemma")
    monkeypatch.setenv("GOOGLE_API_KEY", "AIza-test")
    monkeypatch.setenv("DATAHIVE_AI_MODEL", "gemma-3-12b-it")
    settings = provider.load_settings()
    assert settings.provider == "google"
    assert settings.api_key == "AIza-test"
    assert settings.model == "gemma-3-12b-it"
    assert isinstance(provider.get_provider(settings), provider.GoogleProvider)


def test_google_without_a_key_is_not_configured(monkeypatch):
    monkeypatch.setenv("DATAHIVE_AI_PROVIDER", "google")
    with pytest.raises(provider.AINotConfigured):
        provider.get_provider(provider.load_settings())


def test_gemma_folds_system_into_first_user_turn():
    settings = provider.AISettings(
        provider="google",
        model="gemma-3-12b-it",
        api_key="k",
        base_url=provider.GOOGLE_DEFAULT_BASE_URL,
        timeout=30.0,
        max_rows=100,
        send_results=True,
    )
    gp = provider.GoogleProvider(settings)
    payload = gp._build_payload(
        [
            {"role": "system", "content": "You are a SQL planner."},
            {"role": "user", "content": "How many customers?"},
        ],
        json_mode=True,
        temperature=0.0,
    )
    assert "systemInstruction" not in payload
    assert payload["contents"][0]["role"] == "user"
    assert "SQL planner" in payload["contents"][0]["parts"][0]["text"]
    assert payload["generationConfig"]["responseMimeType"] == "application/json"


def test_openai_key_can_come_from_the_standard_variable(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-standard")
    assert provider.load_settings().api_key == "sk-standard"


def test_openai_without_a_key_is_not_configured(monkeypatch):
    monkeypatch.setenv("DATAHIVE_AI_PROVIDER", "openai")
    with pytest.raises(provider.AINotConfigured):
        provider.get_provider(provider.load_settings())


def test_none_disables_the_feature(monkeypatch):
    monkeypatch.setenv("DATAHIVE_AI_PROVIDER", "none")
    settings = provider.load_settings()
    assert settings.configured is False
    with pytest.raises(provider.AINotConfigured):
        provider.get_provider(settings)


def test_azure_uses_the_openai_compatible_client(monkeypatch):
    monkeypatch.setenv("DATAHIVE_AI_PROVIDER", "azure")
    monkeypatch.setenv("DATAHIVE_AI_API_KEY", "sk-azure")
    monkeypatch.setenv("DATAHIVE_AI_BASE_URL", "https://acme.openai.azure.com/openai/v1/")
    settings = provider.load_settings()
    assert settings.provider == "openai"
    assert settings.base_url == "https://acme.openai.azure.com/openai/v1"


def test_row_cap_is_bounded(monkeypatch):
    monkeypatch.setenv("DATAHIVE_AI_MAX_ROWS", "99999")
    assert provider.load_settings().max_rows == 10_000


def test_send_results_can_be_switched_off(monkeypatch):
    monkeypatch.setenv("DATAHIVE_AI_SEND_RESULTS", "false")
    assert provider.load_settings().send_results is False


def test_status_never_leaks_the_api_key(monkeypatch):
    monkeypatch.setenv("DATAHIVE_AI_PROVIDER", "openai")
    monkeypatch.setenv("DATAHIVE_AI_API_KEY", "sk-secret-value")
    status = provider.provider_status()
    assert status["enabled"] is True
    assert "sk-secret-value" not in str(status)


def test_status_explains_why_it_is_disabled(monkeypatch):
    monkeypatch.setenv("DATAHIVE_AI_PROVIDER", "none")
    status = provider.provider_status()
    assert status["enabled"] is False
    assert status["reason"]


@pytest.mark.parametrize(
    "text",
    [
        '{"sql": "select 1"}',
        '```json\n{"sql": "select 1"}\n```',
        'Sure! Here you go:\n{"sql": "select 1"}\nHope that helps.',
    ],
)
def test_json_is_recovered_from_chatty_output(text):
    assert provider.parse_json_response(text)["sql"] == "select 1"


@pytest.mark.parametrize("text", ["", "no json here at all", "[1, 2, 3]"])
def test_unparseable_output_raises(text):
    with pytest.raises(provider.AIProviderError):
        provider.parse_json_response(text)
