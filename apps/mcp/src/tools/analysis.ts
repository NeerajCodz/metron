import type { McpPrincipal, McpAuthorizer } from "../auth.js";
import {
  RESPONSE_FORMATS,
  toolError,
  toolResult,
  type McpToolResponse,
  type ResponseFormat,
} from "../response.js";
import type { MetronServices } from "../services.js";

import { scoreRoute, type RouteScoreLimits } from "@metron/protocol";
import type { SolverRoute } from "@metron/types";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const responseFormat = z.enum(RESPONSE_FORMATS).default("markdown");
const featureInput = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]));
const stressScenario = z.object({
  eth_price_shock_bps: z.number().int().min(-10_000).max(100_000),
  stablecoin_depeg_bps: z.number().int().min(-10_000).max(10_000),
  dex_liquidity_shock_bps: z.number().int().min(-10_000).max(100_000),
  volatility_multiplier_bps: z.number().int().min(0).max(1_000_000),
  gas_multiplier_bps: z.number().int().min(0).max(1_000_000),
  lending_utilization_shock_bps: z.number().int().min(-10_000).max(10_000),
});

type AnalysisToolContext = {
  services: MetronServices;
  authorizer: McpAuthorizer;
  principal: McpPrincipal;
};

export function registerAnalysisTools(server: McpServer, context: AnalysisToolContext): void {
  server.registerTool(
    "metron_ai_intent_draft",
    {
      title: "Draft Metron Intent",
      description:
        "Parse a natural-language strategy request into a reviewable, approval-required draft.",
      inputSchema: {
        trace_id: z.string().min(1).max(128),
        text: z.string().min(1).max(4_000),
        response_format: responseFormat,
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ trace_id, text, response_format: format }) =>
      executeAnalysis(context, "Intent draft", format, async () =>
        context.services.ai("v1/intent/draft", { trace_id, text }),
      ),
  );

  server.registerTool(
    "metron_ai_scenario_draft",
    {
      title: "Draft Stress Scenario",
      description:
        "Parse a natural-language market stress scenario into an approval-required draft.",
      inputSchema: {
        trace_id: z.string().min(1).max(128),
        text: z.string().min(1).max(4_000),
        response_format: responseFormat,
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ trace_id, text, response_format: format }) =>
      executeAnalysis(context, "Scenario draft", format, async () =>
        context.services.ai("v1/scenario/draft", { trace_id, text }),
      ),
  );

  server.registerTool(
    "metron_ai_simulate",
    {
      title: "Simulate Metron Scenarios",
      description:
        "Run bounded deterministic stress scenarios against a supplied portfolio feature snapshot.",
      inputSchema: {
        position_id: z.string().min(1).max(128),
        trace_id: z.string().min(1).max(128),
        features: featureInput,
        scenarios: z.array(stressScenario).min(1).max(32),
        response_format: responseFormat,
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ position_id, trace_id, features, scenarios, response_format: format }) =>
      executeAnalysis(context, "Scenario simulation", format, async () =>
        context.services.ai("v1/simulation", { position_id, trace_id, features, scenarios }),
      ),
  );

  server.registerTool(
    "metron_ai_cascade",
    {
      title: "Simulate Liquidation Cascade",
      description:
        "Propagate liquidation impact through bounded rounds and report convergence and secondary exposure.",
      inputSchema: {
        trace_id: z.string().min(1).max(128),
        initial_liquidation_usd: z.string().min(1),
        pool_depth_usd: z.string().min(1),
        price_impact_slope_bps: z.number().int().min(0).max(100_000),
        positions: z
          .array(
            z.object({
              position_id: z.string().min(1),
              debt_usd: z.string().min(1),
              health_factor_wad: z.string().min(1),
            }),
          )
          .min(1)
          .max(1_000),
        propagation_factor_bps: z.number().int().min(0).max(20_000).default(10_000),
        max_rounds: z.number().int().min(1).max(32).default(8),
        response_format: responseFormat,
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ response_format: format, ...payload }) =>
      executeAnalysis(context, "Cascade simulation", format, async () =>
        context.services.ai("v1/risk/cascade", payload),
      ),
  );

  server.registerTool(
    "metron_ai_recommend",
    {
      title: "Recommend Recovery Action",
      description:
        "Rank candidate action types using accepted and rejected history inside the supplied policy envelope.",
      inputSchema: {
        trace_id: z.string().min(1).max(128),
        candidate_action_types: z.array(z.string().min(1).max(128)).min(1).max(64),
        allowed_action_types: z.array(z.string().min(1).max(128)).min(1).max(64),
        accepted_history: z.record(z.string(), z.number().int().min(0)).default({}),
        rejected_history: z.record(z.string(), z.number().int().min(0)).default({}),
        response_format: responseFormat,
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ response_format: format, ...payload }) =>
      executeAnalysis(context, "Action recommendation", format, async () =>
        context.services.ai("v1/recommendation", payload),
      ),
  );

  server.registerTool(
    "metron_solver_score_routes",
    {
      title: "Score Solver Routes",
      description:
        "Score and constraint-check candidate routes locally with exact bigint arithmetic.",
      inputSchema: {
        routes: z.array(z.unknown()).min(1).max(100),
        limits: z.object({
          maximumSlippageBps: z.string().min(1),
          maximumDrawdownBps: z.string().min(1),
          maximumLiquidationProbabilityBps: z.string().optional(),
          maximumImpermanentLossBps: z.string().optional(),
          targetDeltaWad: z.string().min(1),
          deltaToleranceWad: z.string().min(1),
          minimumHealthFactorWad: z.string().optional(),
        }),
        response_format: responseFormat,
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ routes, limits, response_format: format }) =>
      executeAnalysis(context, "Solver route scores", format, () => ({
        scores: routes.map((route) => scoreRoute(route as SolverRoute, toScoreLimits(limits))),
      })),
  );
}

async function executeAnalysis(
  context: AnalysisToolContext,
  title: string,
  format: ResponseFormat,
  operation: () => unknown,
): Promise<McpToolResponse> {
  try {
    context.authorizer.requireScope(context.principal, "simulate");
    const payload = await operation();
    return toolResult(objectPayload(payload), format, title);
  } catch (error) {
    return toolError(error);
  }
}

function toScoreLimits(limits: Record<string, string | undefined>): RouteScoreLimits {
  const result: RouteScoreLimits = {
    maximumSlippageBps: BigInt(limits.maximumSlippageBps ?? "0"),
    maximumDrawdownBps: BigInt(limits.maximumDrawdownBps ?? "0"),
    targetDeltaWad: BigInt(limits.targetDeltaWad ?? "0"),
    deltaToleranceWad: BigInt(limits.deltaToleranceWad ?? "0"),
  };
  const optional = {
    maximumLiquidationProbabilityBps: optionalBigInt(limits.maximumLiquidationProbabilityBps),
    maximumImpermanentLossBps: optionalBigInt(limits.maximumImpermanentLossBps),
    minimumHealthFactorWad: optionalBigInt(limits.minimumHealthFactorWad),
  };
  return {
    ...result,
    ...(optional.maximumLiquidationProbabilityBps === undefined
      ? {}
      : { maximumLiquidationProbabilityBps: optional.maximumLiquidationProbabilityBps }),
    ...(optional.maximumImpermanentLossBps === undefined
      ? {}
      : { maximumImpermanentLossBps: optional.maximumImpermanentLossBps }),
    ...(optional.minimumHealthFactorWad === undefined
      ? {}
      : { minimumHealthFactorWad: optional.minimumHealthFactorWad }),
  };
}
function optionalBigInt(value: string | undefined): bigint | undefined {
  return value === undefined ? undefined : BigInt(value);
}

function objectPayload(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : { data: value };
}
