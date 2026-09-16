"""Public runtime exports for provider-neutral advisory model execution."""

from metron_ai.providers import (
    ModelRuntime,
    ProviderCallError,
    ProviderCatalog,
    ProviderCompletion,
    ProviderConfigurationError,
    RuntimeCompletion,
    ToolCall,
    ToolDefinition,
)

# AgentRuntime is the name used by service integrations; both names share one implementation.
AgentRuntime = ModelRuntime

__all__ = [
    "AgentRuntime",
    "ModelRuntime",
    "ProviderCallError",
    "ProviderCatalog",
    "ProviderCompletion",
    "ProviderConfigurationError",
    "RuntimeCompletion",
    "ToolCall",
    "ToolDefinition",
]
