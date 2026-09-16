# Metron MCP server

`@metron/mcp` exposes the Metron portfolio, risk, simulation, solver, recovery, and execution workflows through the standard MCP tool, resource, and prompt interfaces.

## Authentication

HTTP clients must send `Authorization: Bearer <token>`. Configure tokens as comma-separated entries:

```text
METRON_MCP_TOKENS=<reader-token>=read,<operator-token>=read|simulate|execute
```

Tokens must contain at least 32 characters. `admin` includes every scope. HTTP deployments should set `METRON_MCP_ALLOWED_ORIGINS` and `METRON_MCP_ALLOWED_HOSTS`; the server binds to `127.0.0.1` by default.

Required upstream credentials stay server-side:

```text
METRON_AI_BASE_URL=https://ai.example.internal/
METRON_AI_SERVICE_TOKEN=...
METRON_CONVEX_URL=https://your-deployment.convex.cloud/
METRON_INTERNAL_TOKEN=...
METRON_EXECUTION_GATEWAY_URL=https://executor.example.internal/
METRON_EXECUTION_GATEWAY_TOKEN=...
```

Execution is fail-closed: `metron_execution_submit` requires the `execute` scope, `approved: true`, and an execution gateway. Keep `require_approval` enabled in the host client.

## Claude Desktop / Claude Code

For a local stdio server, configure a token in the same environment as the MCP process:

```json
{
  "mcpServers": {
    "metron": {
      "command": "pnpm",
      "args": ["--filter", "@metron/mcp", "dev"],
      "env": {
        "METRON_MCP_TRANSPORT": "stdio",
        "METRON_MCP_TOKEN": "replace-with-32-plus-character-token",
        "METRON_AI_BASE_URL": "https://ai.example.internal/",
        "METRON_AI_SERVICE_TOKEN": "replace-me"
      }
    }
  }
}
```

## OpenAI Responses API

Expose the HTTP transport at `POST /mcp`, then register it as a remote MCP tool. Keep approvals enabled for every write-capable workflow:

```json
{
  "type": "mcp",
  "server_label": "metron",
  "server_url": "https://mcp.example.com/mcp",
  "authorization": "Bearer replace-with-32-plus-character-token",
  "require_approval": "always"
}
```

The same endpoint follows the MCP streamable HTTP protocol used by other MCP-compatible hosts. The server does not require Claude- or OpenAI-specific SDK code.

## Run

```bash
METRON_MCP_TRANSPORT=http METRON_MCP_TOKENS=... pnpm --filter @metron/mcp dev
```

Use `METRON_MCP_TRANSPORT=stdio` for local process integrations. Logs go to stderr so stdout remains valid MCP JSON-RPC.

## Exposed capabilities

- Simulate: intent/scenario drafts, stress simulation, cascade propagation, threshold recommendations, liquidity estimates, allocation optimization, prediction explanations, recommendations, solver route scoring, recovery ranking.
- Execute: explicitly approved action-plan submission through the configured execution gateway.
- Resources: `metron://capabilities`, `metron://security`.
- Prompts: `metron_strategy_review`, `metron_recovery_runbook`.
