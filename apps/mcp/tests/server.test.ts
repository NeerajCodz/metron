import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";

import { McpAuthorizer, loadMcpAuthConfig } from "../src/auth.js";
import { createMetronServer } from "../src/server.js";
import { MetronServices } from "../src/services.js";

const expectedTools = [
  "metron_position_get",
  "metron_positions_list_mine",
  "metron_position_timeline",
  "metron_position_graph",
  "metron_portfolio_risk_snapshot",
  "metron_ai_risk_liquidation",
  "metron_ai_regime_predict",
  "metron_market_observations_latest",
  "metron_position_answer",
  "metron_ai_intent_draft",
  "metron_ai_scenario_draft",
  "metron_ai_simulate",
  "metron_ai_cascade",
  "metron_ai_recommend",
  "metron_ai_threshold",
  "metron_ai_liquidity",
  "metron_ai_allocation",
  "metron_ai_explain",
  "metron_solver_score_routes",
  "metron_ai_recovery_rank",
  "metron_execution_submit",
  "metron_execution_status",
] as const;

describe("Metron MCP surface", () => {
  it("exposes every tool, resource, and prompt through the MCP protocol", async () => {
    const token = "r".repeat(32);
    const authorizer = new McpAuthorizer(
      loadMcpAuthConfig({ METRON_MCP_TOKENS: `${token}=admin` }),
    );
    const server = createMetronServer({
      authorizer,
      principal: { tokenId: "test", scopes: new Set(["read", "simulate", "execute", "admin"]) },
      services: new MetronServices({}),
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "metron-mcp-test-client", version: "0.1.0" });

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    const tools = await client.listTools();
    const resources = await client.listResources();
    const prompts = await client.listPrompts();

    expect(new Set(tools.tools.map((tool) => tool.name))).toEqual(new Set(expectedTools));
    expect(resources.resources.map((resource) => resource.uri)).toEqual([
      "metron://capabilities",
      "metron://security",
    ]);
    expect(prompts.prompts.map((prompt) => prompt.name)).toEqual([
      "metron_strategy_review",
      "metron_recovery_runbook",
    ]);

    await client.close();
    await server.close();
  });
});
