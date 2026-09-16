import type { McpPrincipal, McpAuthorizer } from "./auth.js";
import type { MetronServices } from "./services.js";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const TOOL_SCOPES = {
  read: [
    "metron_position_get",
    "metron_positions_list_mine",
    "metron_position_timeline",
    "metron_position_graph",
    "metron_portfolio_risk_snapshot",
    "metron_ai_risk_liquidation",
    "metron_ai_regime_predict",
    "metron_market_observations_latest",
    "metron_position_answer",
    "metron_execution_status",
  ],
  simulate: [
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
  ],
  execute: ["metron_execution_submit"],
} as const;

type ResourceContext = {
  authorizer: McpAuthorizer;
  principal: McpPrincipal;
  services: MetronServices;
};

export function registerResourcesAndPrompts(server: McpServer, context: ResourceContext): void {
  server.registerResource(
    "metron_capabilities",
    "metron://capabilities",
    {
      title: "Metron MCP Capabilities",
      description: "Tool names and required authorization scopes.",
      mimeType: "application/json",
    },
    () => {
      context.authorizer.requireScope(context.principal, "read");
      return {
        contents: [
          {
            uri: "metron://capabilities",
            mimeType: "application/json",
            text: JSON.stringify({ tool_scopes: TOOL_SCOPES }),
          },
        ],
      };
    },
  );

  server.registerResource(
    "metron_security",
    "metron://security",
    {
      title: "Metron MCP Security",
      description: "Authentication, authorization, and safety contract.",
      mimeType: "text/markdown",
    },
    () => {
      context.authorizer.requireScope(context.principal, "read");
      return {
        contents: [
          {
            uri: "metron://security",
            mimeType: "text/markdown",
            text: "# Metron MCP security\n\n- HTTP requests require a Bearer token.\n- Read, simulate, and execute scopes are enforced per tool.\n- Funds-moving submission requires `approved: true`, execute scope, and a configured execution gateway.\n- AI and Convex service credentials remain server-side.\n- Missing upstream configuration fails closed with a service-unavailable error.",
          },
        ],
      };
    },
  );

  server.registerPrompt(
    "metron_strategy_review",
    {
      title: "Review Metron Strategy",
      description: "Create a structured review request for an existing position.",
      argsSchema: {
        position_id: z.string().min(1).max(128),
        objective: z.string().min(1).max(1_000),
      },
    },
    ({ position_id, objective }) => {
      context.authorizer.requireScope(context.principal, "read");
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Review Metron position ${position_id}. Objective: ${objective}. Use metron_position_get, metron_position_timeline, metron_ai_risk_liquidation, and metron_ai_regime_predict. Cite returned provenance and do not recommend execution without explicit approval.`,
            },
          },
        ],
      };
    },
  );

  server.registerPrompt(
    "metron_recovery_runbook",
    {
      title: "Prepare Recovery Runbook",
      description: "Create a safe, approval-gated recovery workflow for a position.",
      argsSchema: {
        position_id: z.string().min(1).max(128),
        incident: z.string().min(1).max(1_000),
      },
    },
    ({ position_id, incident }) => {
      context.authorizer.requireScope(context.principal, "simulate");
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Prepare a recovery runbook for Metron position ${position_id}. Incident: ${incident}. First call metron_ai_recovery_rank with the current policy, then present the ranked actions and required approval_id. Never call metron_execution_submit until the user explicitly approves the exact action list.`,
            },
          },
        ],
      };
    },
  );
}
