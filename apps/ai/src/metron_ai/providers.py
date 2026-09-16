from __future__ import annotations

import json
import re
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Any
from urllib.parse import quote

import httpx
from pydantic import SecretStr

from metron_ai.runtime_models import (
    BYOKCredentials,
    ModelSelection,
    ProviderDescriptor,
    ProviderKind,
)
from metron_ai.settings import Settings, get_settings

_MODEL_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$")


class ProviderConfigurationError(ValueError):
    """The requested provider/model is not permitted or is not configured."""


class ProviderCallError(RuntimeError):
    """A provider request or response failed without retaining response secrets."""


@dataclass(frozen=True)
class _ProviderConfig:
    id: str
    kind: ProviderKind
    label: str
    default_model: str
    models: tuple[str, ...]
    base_url: str
    env_key: str | None


@dataclass(frozen=True)
class _ResolvedProvider:
    config: _ProviderConfig
    model: str
    endpoint: str
    api_key: str
    protocol: str


@dataclass(frozen=True)
class ToolDefinition:
    name: str
    description: str
    parameters: Mapping[str, Any]


@dataclass(frozen=True)
class ToolCall:
    call_id: str
    name: str
    arguments: Mapping[str, Any]


@dataclass(frozen=True)
class ProviderCompletion:
    text: str
    provider: str
    model: str
    tool_calls: tuple[ToolCall, ...] = ()
    truncated: bool = False


@dataclass(frozen=True)
class RuntimeCompletion:
    text: str
    provider: str
    model: str
    fallback_used: bool = False
    fallback_reason: str | None = None
    tool_calls: tuple[ToolCall, ...] = ()
    truncated: bool = False


class ProviderCatalog:
    """Static provider catalog plus request-scoped credential resolution.

    Catalog entries intentionally expose metadata only. API keys are read from Settings or
    the current request and never placed in a catalog, cache, response, or log record.
    """

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self._configs: dict[str, _ProviderConfig] = {
            "gemini": _ProviderConfig(
                id="gemini",
                kind="gemini",
                label="Google Gemini",
                default_model=self.settings.default_model
                if self.settings.default_provider == "gemini"
                else "gemini-2.5-flash",
                models=(
                    "gemini-2.5-flash",
                    "gemini-2.5-pro",
                    "gemini-2.0-flash",
                    "gemini-1.5-flash",
                ),
                base_url=str(self.settings.gemini_base_url).rstrip("/"),
                env_key="gemini_api_key",
            ),
            "openai": _ProviderConfig(
                id="openai",
                kind="openai_compatible",
                label="OpenAI-compatible",
                default_model="gpt-4o-mini",
                models=("gpt-4o-mini", "gpt-4o", "o4-mini"),
                base_url="https://api.openai.com/v1",
                env_key="openai_api_key",
            ),
            "anthropic": _ProviderConfig(
                id="anthropic",
                kind="anthropic_compatible",
                label="Anthropic-compatible",
                default_model="claude-3-5-haiku-latest",
                models=(
                    "claude-3-5-haiku-latest",
                    "claude-3-5-sonnet-latest",
                    "claude-3-7-sonnet-latest",
                ),
                base_url="https://api.anthropic.com/v1",
                env_key="anthropic_api_key",
            ),
        }

    def descriptors(self) -> list[ProviderDescriptor]:
        return [
            ProviderDescriptor(
                id=config.id,
                kind=config.kind,
                label=config.label,
                default_model=config.default_model,
                models=list(config.models),
                configured=self._configured_key(config),
                supports_tools=True,
            )
            for config in self._configs.values()
        ] + [
            ProviderDescriptor(
                id="custom",
                kind="custom",
                label="Custom compatible endpoint (BYOK)",
                default_model="custom-model",
                models=[],
                configured=False,
                supports_tools=True,
            )
        ]

    def default_selection(self) -> ModelSelection:
        provider = self.settings.default_provider.casefold().replace("_", "-")
        provider = {"openai-compatible": "openai", "anthropic-compatible": "anthropic"}.get(
            provider, provider
        )
        config = self._configs.get(provider)
        if config is None:
            provider = "gemini"
            config = self._configs[provider]
        model = self.settings.default_model if provider == "gemini" else config.default_model
        return ModelSelection(provider=provider, model=model)

    def _configured_key(self, config: _ProviderConfig) -> bool:
        if config.env_key is None:
            return False
        value = getattr(self.settings, config.env_key, None)
        return isinstance(value, SecretStr) and bool(value.get_secret_value())

    def resolve(
        self,
        selection: ModelSelection,
        credentials: BYOKCredentials | None = None,
    ) -> _ResolvedProvider:
        provider_id = selection.provider.casefold().replace("_", "-")
        aliases = {
            "openai-compatible": "openai",
            "anthropic-compatible": "anthropic",
        }
        provider_id = aliases.get(provider_id, provider_id)
        config = self._configs.get(provider_id)
        if provider_id == "custom" or (
            config is None and credentials is not None and credentials.endpoint is not None
        ):
            if credentials is None or credentials.endpoint is None:
                raise ProviderConfigurationError(
                    "custom provider requires request-scoped endpoint and api_key"
                )
            model = selection.model or "custom-model"
            self._validate_model(model)
            dynamic_id = provider_id if provider_id != "custom" else "custom"
            return _ResolvedProvider(
                config=_ProviderConfig(
                    id=dynamic_id,
                    kind="custom",
                    label="Custom compatible endpoint",
                    default_model=model,
                    models=(),
                    base_url=str(credentials.endpoint).rstrip("/"),
                    env_key=None,
                ),
                model=model,
                endpoint=str(credentials.endpoint).rstrip("/"),
                api_key=credentials.api_key.get_secret_value(),
                protocol=credentials.protocol,
            )
        if config is None:
            raise ProviderConfigurationError("provider is not permitted")
        model = selection.model or config.default_model
        self._validate_model(model)
        if (
            credentials is None
            and model not in config.models
            and model != self.settings.default_model
        ):
            raise ProviderConfigurationError("model is not permitted")
        # Known providers use only their pinned endpoint. Custom endpoints must be selected
        # explicitly so a caller cannot silently redirect an environment credential.
        if credentials is not None and credentials.endpoint is not None:
            raise ProviderConfigurationError("endpoint override requires provider=custom")
        api_key = credentials.api_key.get_secret_value() if credentials is not None else None
        if api_key is None:
            configured = getattr(self.settings, config.env_key or "", None)
            api_key = configured.get_secret_value() if isinstance(configured, SecretStr) else None
        if not api_key:
            raise ProviderConfigurationError("provider credentials are not configured")
        return _ResolvedProvider(
            config=config,
            model=model,
            endpoint=config.base_url,
            api_key=api_key,
            protocol="gemini"
            if config.kind == "gemini"
            else ("anthropic" if config.kind == "anthropic_compatible" else "openai"),
        )

    @staticmethod
    def _validate_model(model: str) -> None:
        if not _MODEL_RE.fullmatch(model):
            raise ProviderConfigurationError("model contains unsupported characters")


class ModelRuntime:
    """Bounded, non-streaming provider runtime with deterministic fallback."""

    def __init__(self, catalog: ProviderCatalog | None = None) -> None:
        self.catalog = catalog or ProviderCatalog()

    async def generate(
        self,
        selection: ModelSelection,
        prompt: str,
        *,
        credentials: BYOKCredentials | None = None,
        tools: Sequence[ToolDefinition] = (),
        timeout_seconds: float | None = None,
        max_output_chars: int | None = None,
        fallback_text: str = "Model unavailable; deterministic advisory fallback applied.",
    ) -> RuntimeCompletion:
        settings = self.catalog.settings
        timeout = min(
            timeout_seconds or settings.request_timeout_seconds, settings.request_timeout_seconds
        )
        output_limit = min(max_output_chars or settings.max_output_chars, settings.max_output_chars)
        try:
            resolved = self.catalog.resolve(selection, credentials)
            completion = await self._complete(resolved, prompt, tools, timeout)
            bounded, truncated = self._bound(completion.text, output_limit)
            return RuntimeCompletion(
                text=bounded,
                provider=completion.provider,
                model=completion.model,
                tool_calls=completion.tool_calls,
                truncated=truncated or completion.truncated,
            )
        except (
            ProviderConfigurationError,
            ProviderCallError,
            httpx.HTTPError,
            TimeoutError,
            ValueError,
            TypeError,
            KeyError,
            IndexError,
            AttributeError,
        ):
            bounded, truncated = self._bound(fallback_text, output_limit)
            return RuntimeCompletion(
                text=bounded,
                provider="deterministic",
                model="risk-deterministic-v1",
                fallback_used=True,
                fallback_reason="provider_unavailable",
                truncated=truncated,
            )

    async def _complete(
        self,
        provider: _ResolvedProvider,
        prompt: str,
        tools: Sequence[ToolDefinition],
        request_timeout: float,
    ) -> ProviderCompletion:
        if not prompt.strip():
            raise ProviderCallError("empty prompt")
        if provider.protocol == "gemini":
            return await self._gemini(provider, prompt, tools, request_timeout)
        if provider.protocol == "anthropic":
            return await self._anthropic(provider, prompt, tools, request_timeout)
        return await self._openai(provider, prompt, tools, request_timeout)

    async def _gemini(
        self,
        provider: _ResolvedProvider,
        prompt: str,
        tools: Sequence[ToolDefinition],
        request_timeout: float,
    ) -> ProviderCompletion:
        endpoint = (
            f"{provider.endpoint}/v1beta/models/{quote(provider.model, safe='')}:generateContent"
        )
        body: dict[str, Any] = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"maxOutputTokens": max(32, min(8192, len(prompt) // 2 + 512))},
        }
        if tools:
            body["tools"] = [{"function_declarations": [self._gemini_tool(tool) for tool in tools]}]
        async with httpx.AsyncClient(timeout=request_timeout, follow_redirects=False) as client:
            # Keep the key out of the URL: URLs are commonly retained by proxies and access logs.
            response = await client.post(
                endpoint,
                headers={"x-goog-api-key": provider.api_key, "Content-Type": "application/json"},
                json=body,
            )
        if response.status_code >= 400:
            raise ProviderCallError("gemini request failed")
        try:
            payload = response.json()
            candidate = payload["candidates"][0]
            parts = candidate["content"]["parts"]
        except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
            raise ProviderCallError("invalid gemini response") from exc
        text = "".join(part.get("text", "") for part in parts if isinstance(part, dict))
        calls = tuple(
            self._tool_call(part, index)
            for index, part in enumerate(parts)
            if isinstance(part, dict) and isinstance(part.get("functionCall"), dict)
        )
        return ProviderCompletion(
            text=text, provider=provider.config.id, model=provider.model, tool_calls=calls
        )

    async def _openai(
        self,
        provider: _ResolvedProvider,
        prompt: str,
        tools: Sequence[ToolDefinition],
        request_timeout: float,
    ) -> ProviderCompletion:
        endpoint = (
            provider.endpoint
            if provider.endpoint.endswith("/chat/completions")
            else f"{provider.endpoint}/chat/completions"
        )
        body: dict[str, Any] = {
            "model": provider.model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": max(32, min(8192, len(prompt) // 2 + 512)),
        }
        if tools:
            body["tools"] = [
                {"type": "function", "function": self._openai_tool(tool)} for tool in tools
            ]
        headers = {
            "Authorization": f"Bearer {provider.api_key}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=request_timeout, follow_redirects=False) as client:
            response = await client.post(endpoint, headers=headers, json=body)
        if response.status_code >= 400:
            raise ProviderCallError("openai-compatible request failed")
        try:
            message = response.json()["choices"][0]["message"]
        except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
            raise ProviderCallError("invalid openai-compatible response") from exc
        content = message.get("content", "") if isinstance(message, Mapping) else ""
        if isinstance(content, str):
            text = content
        elif isinstance(content, list):
            text = "".join(
                item.get("text", "")
                for item in content
                if isinstance(item, Mapping) and isinstance(item.get("text"), str)
            )
        else:
            text = ""
        calls = tuple(
            self._openai_call(call, index)
            for index, call in enumerate(
                message.get("tool_calls", []) if isinstance(message, Mapping) else []
            )
            if isinstance(call, Mapping)
        )
        return ProviderCompletion(
            text=text, provider=provider.config.id, model=provider.model, tool_calls=calls
        )

    async def _anthropic(
        self,
        provider: _ResolvedProvider,
        prompt: str,
        tools: Sequence[ToolDefinition],
        request_timeout: float,
    ) -> ProviderCompletion:
        endpoint = (
            provider.endpoint
            if provider.endpoint.endswith("/messages")
            else f"{provider.endpoint}/messages"
        )
        body: dict[str, Any] = {
            "model": provider.model,
            "max_tokens": max(32, min(8192, len(prompt) // 2 + 512)),
            "messages": [{"role": "user", "content": prompt}],
        }
        if tools:
            body["tools"] = [
                {
                    "name": tool.name,
                    "description": tool.description,
                    "input_schema": dict(tool.parameters),
                }
                for tool in tools
            ]
        headers = {
            "x-api-key": provider.api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=request_timeout, follow_redirects=False) as client:
            response = await client.post(endpoint, headers=headers, json=body)
        if response.status_code >= 400:
            raise ProviderCallError("anthropic-compatible request failed")
        try:
            content = response.json()["content"]
        except (KeyError, TypeError, json.JSONDecodeError) as exc:
            raise ProviderCallError("invalid anthropic-compatible response") from exc
        text = "".join(
            block.get("text", "")
            for block in content
            if isinstance(block, dict) and isinstance(block.get("text"), str)
        )
        calls = tuple(
            self._anthropic_call(block, index)
            for index, block in enumerate(content)
            if isinstance(block, dict) and block.get("type") == "tool_use"
        )
        return ProviderCompletion(
            text=text, provider=provider.config.id, model=provider.model, tool_calls=calls
        )

    @staticmethod
    def _gemini_schema(value: Mapping[str, Any]) -> dict[str, Any]:
        allowed = {
            "type",
            "format",
            "description",
            "nullable",
            "enum",
            "items",
            "properties",
            "required",
        }
        sanitized: dict[str, Any] = {}
        for key, item in value.items():
            if key not in allowed:
                continue
            if key == "properties" and isinstance(item, Mapping):
                sanitized[key] = {
                    str(name): ModelRuntime._gemini_schema(schema)
                    for name, schema in item.items()
                    if isinstance(schema, Mapping)
                }
            elif key in {"items"} and isinstance(item, Mapping):
                sanitized[key] = ModelRuntime._gemini_schema(item)
            else:
                sanitized[key] = item
        return sanitized

    @staticmethod
    def _gemini_tool(tool: ToolDefinition) -> dict[str, Any]:
        return {
            "name": tool.name,
            "description": tool.description,
            "parameters": ModelRuntime._gemini_schema(tool.parameters),
        }

    @staticmethod
    def _openai_tool(tool: ToolDefinition) -> dict[str, Any]:
        return {
            "name": tool.name,
            "description": tool.description,
            "parameters": dict(tool.parameters),
        }

    @staticmethod
    def _safe_tool_arguments(args: Any) -> dict[str, Any]:
        if not isinstance(args, Mapping):
            return {}
        # Keep only the fixed tool vocabulary and bound each user-controlled string.
        safe: dict[str, Any] = {}
        for key, limit in (("url", 2048), ("query", 500), ("action", 200), ("reason", 1000)):
            value = args.get(key)
            if isinstance(value, str):
                safe[key] = value[:limit]
        risk = args.get("risk_bps")
        if isinstance(risk, int) and not isinstance(risk, bool):
            safe["risk_bps"] = risk
        return safe

    @staticmethod
    def _tool_call(part: Mapping[str, Any], index: int) -> ToolCall:
        function = part.get("functionCall", {})
        args = function.get("args", {}) if isinstance(function, Mapping) else {}
        safe_args = ModelRuntime._safe_tool_arguments(args)
        return ToolCall(
            call_id=f"gemini-{index}", name=str(function.get("name", ""))[:128], arguments=safe_args
        )

    @staticmethod
    def _openai_call(call: Mapping[str, Any], index: int) -> ToolCall:
        function = call.get("function", {})
        raw_args = function.get("arguments", "{}") if isinstance(function, Mapping) else "{}"
        try:
            args = json.loads(raw_args[:32_000]) if isinstance(raw_args, str) else raw_args
        except json.JSONDecodeError:
            args = {}
        safe_args = ModelRuntime._safe_tool_arguments(args)
        return ToolCall(
            call_id=str(call.get("id", f"openai-{index}"))[:128],
            name=str(function.get("name", ""))[:128],
            arguments=safe_args,
        )

    @staticmethod
    def _anthropic_call(block: Mapping[str, Any], index: int) -> ToolCall:
        args = block.get("input", {})
        safe_args = ModelRuntime._safe_tool_arguments(args)
        return ToolCall(
            call_id=str(block.get("id", f"anthropic-{index}"))[:128],
            name=str(block.get("name", ""))[:128],
            arguments=safe_args,
        )

    @staticmethod
    def _bound(text: str, limit: int) -> tuple[str, bool]:
        value = text if isinstance(text, str) else str(text)
        return (value[:limit], len(value) > limit)
