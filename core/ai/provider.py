"""Pluggable LLM backend.

Providers are plain HTTP calls rather than vendor SDKs: the install stays light,
and swapping a hosted model for a local Ollama is a one-line `.env` change.

Configuration (repo-root `.env`):
    DATAHIVE_AI_PROVIDER    auto | openai | google | ollama | none   (default: auto)
    DATAHIVE_AI_MODEL       model name, provider specific
    DATAHIVE_AI_API_KEY     falls back to OPENAI_API_KEY / GOOGLE_API_KEY / GEMINI_API_KEY
    DATAHIVE_AI_BASE_URL    override the provider endpoint
    DATAHIVE_AI_TIMEOUT     seconds per request (default: 60)
    DATAHIVE_AI_MAX_ROWS    row cap for generated queries (default: 500)
    DATAHIVE_AI_SEND_RESULTS  false keeps result rows out of every prompt
    DATAHIVE_AI_THINK       true lets a reasoning model deliberate (Ollama only)

`auto` picks OpenAI when an API key is present and otherwise disables the
feature. Running locally is opt-in: set DATAHIVE_AI_PROVIDER=ollama explicitly.
Google Gemma / Gemini use the native Generative Language API
(`DATAHIVE_AI_PROVIDER=google`).
"""
from __future__ import annotations

import json
import logging
import os
import re
from dataclasses import dataclass
from typing import Any, Protocol
from urllib.parse import quote

import httpx

from ..config import load_repo_dotenv
from .errors import AINotConfigured, AIProviderError

_log = logging.getLogger("datahive.ai.provider")

Message = dict[str, str]

OPENAI_DEFAULT_BASE_URL = "https://api.openai.com/v1"
OPENAI_DEFAULT_MODEL = "gpt-4o-mini"
OLLAMA_DEFAULT_BASE_URL = "http://127.0.0.1:11434"
OLLAMA_DEFAULT_MODEL = "llama3.1"
GOOGLE_DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"
GOOGLE_DEFAULT_MODEL = "gemma-3-12b-it"

_JSON_FENCE = re.compile(r"```(?:json)?\s*(.*?)```", re.DOTALL | re.IGNORECASE)

# Re-export so existing `from core.ai.provider import AINotConfigured` keeps working.
__all__ = [
    "AINotConfigured",
    "AIProviderError",
    "AISettings",
    "GoogleProvider",
    "LLMProvider",
    "OllamaProvider",
    "OpenAIProvider",
    "get_provider",
    "load_settings",
    "parse_json_response",
    "provider_status",
]


@dataclass(frozen=True)
class AISettings:
    provider: str
    model: str
    api_key: str
    base_url: str
    timeout: float
    max_rows: int
    send_results: bool
    think: bool = False

    @property
    def configured(self) -> bool:
        return self.provider in {"openai", "ollama", "google"}


def _env(name: str, default: str = "") -> str:
    return (os.environ.get(name) or default).strip()


def _env_bool(name: str, default: bool) -> bool:
    raw = _env(name).lower()
    if not raw:
        return default
    return raw in {"1", "true", "yes", "on"}


def _env_int(name: str, default: int) -> int:
    try:
        return int(_env(name) or default)
    except ValueError:
        return default


def _env_float(name: str, default: float) -> float:
    try:
        return float(_env(name) or default)
    except ValueError:
        return default


def load_settings() -> AISettings:
    """Read AI configuration from the environment / repo-root `.env`."""
    load_repo_dotenv()

    api_key = (
        _env("DATAHIVE_AI_API_KEY")
        or _env("OPENAI_API_KEY")
        or _env("GOOGLE_API_KEY")
        or _env("GEMINI_API_KEY")
    )
    provider = _env("DATAHIVE_AI_PROVIDER", "auto").lower()
    if provider in {"", "auto"}:
        # Never guess at a local daemon: an unset provider hides the tab rather
        # than showing one that errors on every question.
        provider = "openai" if api_key else "none"
    if provider in {"openai", "azure", "azure-openai", "azureopenai"}:
        # Azure exposes an OpenAI-compatible surface; the deployment URL goes in BASE_URL.
        provider = "openai"
        default_base, default_model = OPENAI_DEFAULT_BASE_URL, OPENAI_DEFAULT_MODEL
    elif provider in {"google", "gemini", "gemma", "google-ai", "googleai"}:
        # Native Generative Language API (required for Gemma; also works for Gemini).
        provider = "google"
        default_base, default_model = GOOGLE_DEFAULT_BASE_URL, GOOGLE_DEFAULT_MODEL
    elif provider == "ollama":
        default_base, default_model = OLLAMA_DEFAULT_BASE_URL, OLLAMA_DEFAULT_MODEL
    else:
        provider, default_base, default_model = "none", "", ""

    return AISettings(
        provider=provider,
        model=_env("DATAHIVE_AI_MODEL", default_model),
        api_key=api_key,
        base_url=_env("DATAHIVE_AI_BASE_URL", default_base).rstrip("/"),
        timeout=_env_float("DATAHIVE_AI_TIMEOUT", 60.0),
        max_rows=max(1, min(_env_int("DATAHIVE_AI_MAX_ROWS", 500), 10_000)),
        send_results=_env_bool("DATAHIVE_AI_SEND_RESULTS", True),
        think=_env_bool("DATAHIVE_AI_THINK", False),
    )


class LLMProvider(Protocol):
    name: str
    model: str

    def complete(
        self,
        messages: list[Message],
        *,
        json_mode: bool = False,
        temperature: float = 0.0,
    ) -> str:
        ...


class OpenAIProvider:
    """OpenAI (and any OpenAI-compatible endpoint, including Azure)."""

    name = "openai"

    def __init__(self, settings: AISettings):
        self._settings = settings
        self.model = settings.model or OPENAI_DEFAULT_MODEL
        self._base_url = settings.base_url or OPENAI_DEFAULT_BASE_URL

    def complete(
        self,
        messages: list[Message],
        *,
        json_mode: bool = False,
        temperature: float = 0.0,
    ) -> str:
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        data = self._post(payload)
        if data is None:
            # Reasoning models reject an explicit temperature; retry with their default.
            payload.pop("temperature", None)
            data = self._post(payload, allow_temperature_retry=False)

        try:
            return str(data["choices"][0]["message"]["content"] or "")
        except (KeyError, IndexError, TypeError) as exc:
            raise AIProviderError(f"Unexpected OpenAI response shape: {data}") from exc

    def _post(
        self, payload: dict[str, Any], *, allow_temperature_retry: bool = True
    ) -> dict[str, Any] | None:
        url = f"{self._base_url}/chat/completions"
        headers = {"Authorization": f"Bearer {self._settings.api_key}"}
        try:
            response = httpx.post(
                url, json=payload, headers=headers, timeout=self._settings.timeout
            )
        except httpx.HTTPError as exc:
            raise AIProviderError(f"Could not reach the model endpoint: {exc}") from exc

        if response.status_code == 400 and allow_temperature_retry:
            if "temperature" in response.text.lower():
                return None
        if response.status_code == 401:
            raise AINotConfigured(
                "The configured DATAHIVE_AI_API_KEY was rejected by the model endpoint."
            )
        if response.status_code >= 400:
            raise AIProviderError(
                f"Model request failed ({response.status_code}): {response.text[:400]}"
            )
        return response.json()


class GoogleProvider:
    """Google AI Studio / Gemini API (native generateContent).

    Required for Gemma models, which are not reliably available on Google's
    OpenAI-compatible endpoint. Also works for Gemini model ids.
    """

    name = "google"

    def __init__(self, settings: AISettings):
        self._settings = settings
        self.model = (settings.model or GOOGLE_DEFAULT_MODEL).removeprefix("models/")
        self._base_url = (settings.base_url or GOOGLE_DEFAULT_BASE_URL).rstrip("/")

    def complete(
        self,
        messages: list[Message],
        *,
        json_mode: bool = False,
        temperature: float = 0.0,
    ) -> str:
        payload = self._build_payload(messages, json_mode=json_mode, temperature=temperature)
        data = self._post(payload)
        if data is None and json_mode:
            # Some Gemma variants reject responseMimeType; rely on prompt + parse.
            payload = self._build_payload(messages, json_mode=False, temperature=temperature)
            data = self._post(payload, allow_json_retry=False)
        if data is None:
            raise AIProviderError("Google Generative Language API returned an empty body.")
        return self._extract_text(data)

    def _build_payload(
        self,
        messages: list[Message],
        *,
        json_mode: bool,
        temperature: float,
    ) -> dict[str, Any]:
        system_chunks: list[str] = []
        contents: list[dict[str, Any]] = []
        for msg in messages:
            role = (msg.get("role") or "user").lower()
            text = str(msg.get("content") or "")
            if not text.strip():
                continue
            if role == "system":
                system_chunks.append(text)
                continue
            google_role = "model" if role in {"assistant", "model"} else "user"
            contents.append({"role": google_role, "parts": [{"text": text}]})

        # Gemma often rejects a separate systemInstruction; fold it into the first user turn.
        system_text = "\n\n".join(system_chunks).strip()
        is_gemma = self.model.lower().startswith("gemma")
        if system_text and contents and contents[0]["role"] == "user" and is_gemma:
            first = contents[0]["parts"][0]["text"]
            contents[0]["parts"][0]["text"] = system_text + "\n\n" + first
            system_text = ""
        elif system_text and not contents:
            contents = [{"role": "user", "parts": [{"text": system_text}]}]
            system_text = ""

        if not contents:
            raise AIProviderError("No messages to send to the Google model.")

        # Alternating roles: if two user turns land back-to-back, merge them.
        merged: list[dict[str, Any]] = []
        for item in contents:
            if merged and merged[-1]["role"] == item["role"]:
                merged[-1]["parts"][0]["text"] += "\n\n" + item["parts"][0]["text"]
            else:
                merged.append(item)

        payload: dict[str, Any] = {
            "contents": merged,
            "generationConfig": {
                "temperature": temperature,
            },
        }
        if system_text and not is_gemma:
            payload["systemInstruction"] = {"parts": [{"text": system_text}]}
        elif system_text and is_gemma:
            # Fallback if there was no user turn to fold into.
            merged[0]["parts"][0]["text"] = system_text + "\n\n" + merged[0]["parts"][0]["text"]

        if json_mode:
            payload["generationConfig"]["responseMimeType"] = "application/json"
        return payload

    def _post(
        self, payload: dict[str, Any], *, allow_json_retry: bool = True
    ) -> dict[str, Any] | None:
        model_path = quote(self.model, safe="-_.")
        url = f"{self._base_url}/models/{model_path}:generateContent"
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": self._settings.api_key,
        }
        try:
            response = httpx.post(
                url, json=payload, headers=headers, timeout=self._settings.timeout
            )
        except httpx.HTTPError as exc:
            raise AIProviderError(
                f"Could not reach Google Generative Language API: {exc}"
            ) from exc

        if response.status_code in {400, 404} and allow_json_retry:
            body = response.text.lower()
            if "responsemimetype" in body or "mime" in body or "json" in body:
                return None
        if response.status_code in {401, 403}:
            raise AINotConfigured(
                "The configured Google AI API key was rejected. "
                "Check DATAHIVE_AI_API_KEY / GOOGLE_API_KEY from Google AI Studio."
            )
        if response.status_code >= 400:
            raise AIProviderError(
                f"Google model request failed ({response.status_code}): {response.text[:400]}"
            )
        return response.json()

    @staticmethod
    def _extract_text(data: dict[str, Any]) -> str:
        try:
            candidates = data.get("candidates") or []
            parts = candidates[0]["content"]["parts"]
            texts = [str(p.get("text") or "") for p in parts if isinstance(p, dict)]
            text = "".join(texts).strip()
            if text:
                return text
        except (KeyError, IndexError, TypeError) as exc:
            raise AIProviderError(f"Unexpected Google response shape: {data}") from exc
        # Blocked / empty completion
        feedback = data.get("promptFeedback") or {}
        block = feedback.get("blockReason") or ""
        raise AIProviderError(
            "Google model returned no text"
            + (f" (blocked: {block})" if block else "")
            + f": {data}"
        )


class OllamaProvider:
    """Local Ollama daemon — no credentials, nothing leaves the machine."""

    name = "ollama"

    def __init__(self, settings: AISettings):
        self._settings = settings
        self.model = settings.model or OLLAMA_DEFAULT_MODEL
        self._base_url = settings.base_url or OLLAMA_DEFAULT_BASE_URL

    def complete(
        self,
        messages: list[Message],
        *,
        json_mode: bool = False,
        temperature: float = 0.0,
    ) -> str:
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "options": {"temperature": temperature},
        }
        if json_mode:
            payload["format"] = "json"
        if not self._settings.think:
            # Reasoning models spend most of their time here, and this pipeline
            # gives them the schema outright. Measured ~18x faster off.
            payload["think"] = False

        data = self._post(payload)
        if data is None:
            payload.pop("think", None)
            data = self._post(payload, allow_think_retry=False)
        try:
            # Reasoning lands in a separate `thinking` key, so content is clean.
            return str(data["message"]["content"] or "")
        except (KeyError, TypeError) as exc:
            raise AIProviderError(f"Unexpected Ollama response shape: {data}") from exc

    def _post(
        self, payload: dict[str, Any], *, allow_think_retry: bool = True
    ) -> dict[str, Any] | None:
        try:
            response = httpx.post(
                f"{self._base_url}/api/chat",
                json=payload,
                timeout=self._settings.timeout,
            )
        except httpx.HTTPError as exc:
            raise AIProviderError(
                f"Could not reach Ollama at {self._base_url}: {exc}. "
                "Start it with `ollama serve`, or set DATAHIVE_AI_PROVIDER=google|openai."
            ) from exc

        if response.status_code >= 400:
            # Older daemons and non-reasoning models reject `think`; drop it and retry.
            if allow_think_retry and "think" in response.text.lower():
                return None
            raise AIProviderError(
                f"Ollama request failed ({response.status_code}): {response.text[:400]}"
            )
        return response.json()


def get_provider(settings: AISettings | None = None) -> LLMProvider:
    """Build the configured provider, or raise AINotConfigured."""
    cfg = settings or load_settings()
    if cfg.provider == "openai":
        if not cfg.api_key:
            raise AINotConfigured(
                "OpenAI is selected but no key is set. Add DATAHIVE_AI_API_KEY to .env, "
                "or set DATAHIVE_AI_PROVIDER=google / ollama."
            )
        return OpenAIProvider(cfg)
    if cfg.provider == "google":
        if not cfg.api_key:
            raise AINotConfigured(
                "Google AI is selected but no key is set. Add DATAHIVE_AI_API_KEY "
                "(or GOOGLE_API_KEY / GEMINI_API_KEY) from Google AI Studio."
            )
        return GoogleProvider(cfg)
    if cfg.provider == "ollama":
        return OllamaProvider(cfg)
    raise AINotConfigured(
        "Natural-language querying is disabled. Set DATAHIVE_AI_PROVIDER in .env "
        "to `google` (Gemma/Gemini), `openai`, or `ollama`."
    )


def provider_status() -> dict[str, Any]:
    """Non-raising summary for the health endpoint. Never includes the API key."""
    cfg = load_settings()
    try:
        get_provider(cfg)
    except AINotConfigured as exc:
        return {
            "enabled": False,
            "provider": cfg.provider,
            "model": cfg.model,
            "reason": str(exc),
        }
    return {
        "enabled": True,
        "provider": cfg.provider,
        "model": cfg.model,
        "base_url": cfg.base_url,
        "max_rows": cfg.max_rows,
        "send_results": cfg.send_results,
    }


def parse_json_response(text: str) -> dict[str, Any]:
    """Parse a JSON object out of a completion, tolerating prose and code fences."""
    raw = (text or "").strip()
    if not raw:
        raise AIProviderError("The model returned an empty response.")

    candidates = [raw]
    fenced = _JSON_FENCE.search(raw)
    if fenced:
        candidates.insert(0, fenced.group(1).strip())
    start, end = raw.find("{"), raw.rfind("}")
    if start != -1 and end > start:
        candidates.append(raw[start : end + 1])

    for candidate in candidates:
        try:
            parsed = json.loads(candidate)
        except json.JSONDecodeError:
            continue
        if isinstance(parsed, dict):
            return parsed

    _log.warning("model returned non-JSON output: %s", raw[:300])
    raise AIProviderError("The model did not return valid JSON.")
