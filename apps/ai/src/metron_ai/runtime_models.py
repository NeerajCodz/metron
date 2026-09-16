from __future__ import annotations

import re
from typing import Annotated, Literal

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, Field, SecretStr, StringConstraints, field_validator, model_validator


ProviderKind = Literal["gemini", "openai_compatible", "anthropic_compatible", "custom"]
ProviderProtocol = Literal["gemini", "openai", "anthropic"]
ToolName = Literal["internet_research", "scenario_observe", "simulation_propose"]
BotStrategy = Literal["hold", "risk_off", "liquidity_guard", "stress_test", "rebalance"]
TurnMode = Literal["simulation", "solver"]
Primitive = str | int | float | bool | None

SafeIdentifier = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=128)]

_SENSITIVE_KEY_MARKERS = (
    "private",
    "secret",
    "password",
    "credential",
    "mnemonic",
    "seed_phrase",
    "access_token",
    "refresh_token",
    "api_key",
)


_PRIVATE_MATERIAL_RE = re.compile(
    r"-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----|(?:0x)?[0-9a-f]{64}",
    flags=re.IGNORECASE,
)


def _reject_sensitive_text(value: str, field_name: str) -> str:
    if _PRIVATE_MATERIAL_RE.search(value):
        raise ValueError(f"{field_name} must not contain private key material")
    return value

def _reject_sensitive_keys(value: dict[str, Primitive], field_name: str) -> dict[str, Primitive]:
    for key, item in value.items():
        normalized = key.casefold().replace("-", "_")
        if any(marker in normalized for marker in _SENSITIVE_KEY_MARKERS):
            raise ValueError(f"{field_name} must not contain credential or private-key fields")
        if isinstance(item, str):
            _reject_sensitive_text(item, field_name)
    return value

def _default_tools() -> list[ToolName]:
    return ["internet_research"]



class ModelSelection(BaseModel):
    """Explicit model routing. Omitting both values selects configured Gemini defaults."""

    provider: SafeIdentifier = "gemini"
    model: SafeIdentifier | None = None

    @field_validator("provider")
    @classmethod
    def normalize_provider(cls, value: str) -> str:
        return value.casefold()


class BYOKCredentials(BaseModel):
    """Request-scoped credentials; this model is never persisted or returned by the API."""

    model_config = ConfigDict(extra="forbid")

    api_key: SecretStr = Field(min_length=1, description="Used only for this request")
    endpoint: AnyHttpUrl | None = None
    protocol: ProviderProtocol = "openai"


class ProviderDescriptor(BaseModel):
    id: str
    kind: ProviderKind
    label: str
    default_model: str
    models: list[str] = Field(default_factory=list)
    configured: bool = False
    supports_tools: bool = True


class ProviderCatalogResponse(BaseModel):
    providers: list[ProviderDescriptor]
    default_provider: str
    default_model: str


class ToolRequest(BaseModel):
    name: ToolName
    # The runtime maps only known fields from this structure to a tool call.
    url: AnyHttpUrl | None = None
    query: str | None = Field(default=None, max_length=500)
    action: str | None = Field(default=None, max_length=200)
    reason: str | None = Field(default=None, max_length=1000)
    risk_bps: int | None = Field(default=None, ge=0, le=10_000)

    @model_validator(mode="after")
    def validate_arguments(self) -> ToolRequest:
        if self.name == "internet_research" and self.url is None:
            raise ValueError("internet_research requires url")
        if self.name == "simulation_propose" and (not self.action or not self.reason):
            raise ValueError("simulation_propose requires action and reason")
        return self


class DeterministicBotRequest(BaseModel):
    bot_id: SafeIdentifier
    strategy: BotStrategy
    rationale: str | None = Field(default=None, max_length=500)


class AgentTurnRequest(BaseModel):
    agent_id: SafeIdentifier
    objective: str = Field(min_length=1, max_length=2000)
    context: dict[str, Primitive] = Field(default_factory=dict, max_length=64)
    tools: list[ToolName] = Field(default_factory=_default_tools, max_length=8)

    @field_validator("objective")
    @classmethod
    def objective_is_public(cls, value: str) -> str:
        return _reject_sensitive_text(value, "objective")

    @field_validator("context")
    @classmethod
    def context_is_public(cls, value: dict[str, Primitive]) -> dict[str, Primitive]:
        return _reject_sensitive_keys(value, "context")

    @field_validator("tools")
    @classmethod
    def unique_tools(cls, value: list[ToolName]) -> list[ToolName]:
        if len(value) != len(set(value)):
            raise ValueError("tools must be unique")
        return value


class SimulationTurnRequest(BaseModel):
    trace_id: SafeIdentifier
    scenario_id: SafeIdentifier
    mode: TurnMode = "simulation"
    state: dict[str, Primitive] = Field(default_factory=dict, max_length=128)
    bots: list[DeterministicBotRequest] = Field(default_factory=list, max_length=32)
    agents: list[AgentTurnRequest] = Field(default_factory=list, max_length=16)
    selection: ModelSelection = Field(default_factory=ModelSelection)
    credentials: BYOKCredentials | None = None
    max_turns: int = Field(default=32, ge=1, le=64)
    timeout_seconds: float = Field(default=20.0, gt=0, le=60)
    max_output_chars: int = Field(default=4000, ge=64, le=16_000)

    @field_validator("state")
    @classmethod
    def state_is_public(cls, value: dict[str, Primitive]) -> dict[str, Primitive]:
        return _reject_sensitive_keys(value, "state")

    @model_validator(mode="after")
    def has_turn(self) -> SimulationTurnRequest:
        if not self.bots and not self.agents:
            raise ValueError("at least one bot or agent turn is required")
        if len(self.bots) + len(self.agents) > self.max_turns:
            raise ValueError("bot and agent turns exceed max_turns")
        return self


class SolverRequest(BaseModel):
    trace_id: SafeIdentifier
    scenario_id: SafeIdentifier = "solver"
    objective: str = Field(min_length=1, max_length=4000)
    state: dict[str, Primitive] = Field(default_factory=dict, max_length=128)
    agents: list[AgentTurnRequest] = Field(min_length=1, max_length=16)
    selection: ModelSelection = Field(default_factory=ModelSelection)
    credentials: BYOKCredentials | None = None
    timeout_seconds: float = Field(default=20.0, gt=0, le=60)
    max_output_chars: int = Field(default=4000, ge=64, le=16_000)

    @field_validator("objective")
    @classmethod
    def objective_is_public(cls, value: str) -> str:
        return _reject_sensitive_text(value, "objective")

    @field_validator("state")
    @classmethod
    def state_is_public(cls, value: dict[str, Primitive]) -> dict[str, Primitive]:
        return _reject_sensitive_keys(value, "state")


class ProvenanceEvent(BaseModel):
    trace_id: str
    turn_id: str
    kind: Literal["bot", "model", "deterministic_fallback", "tool"]
    source: str
    provider: str | None = None
    model: str | None = None
    reference: str | None = None


class ToolExecution(BaseModel):
    tool_id: str
    name: str = Field(min_length=1, max_length=128)
    ok: bool
    result: str = Field(max_length=16_000)
    provenance: ProvenanceEvent


class BotTurnResult(BaseModel):
    turn_id: str
    bot_id: str
    strategy: BotStrategy
    action: str
    rationale: str
    state_updates: dict[str, Primitive] = Field(default_factory=dict)
    provenance: ProvenanceEvent


class AgentTurnResult(BaseModel):
    turn_id: str
    agent_id: str
    objective: str
    answer: str = Field(max_length=16_000)
    advisory: Literal[True] = True
    signing_authorized: Literal[False] = False
    fallback_used: bool = False
    tool_executions: list[ToolExecution] = Field(default_factory=list)
    provenance: ProvenanceEvent


class SimulationTurnResponse(BaseModel):
    trace_id: str
    scenario_id: str
    mode: TurnMode
    state: dict[str, Primitive]
    bot_turns: list[BotTurnResult] = Field(default_factory=list)
    agent_turns: list[AgentTurnResult] = Field(default_factory=list)
    provenance: list[ProvenanceEvent] = Field(default_factory=list)
    fallback_used: bool = False
    fallback_reason: str | None = None
