import type { McpPrincipal, McpAuthorizer } from "../auth.js";
import {
  RESPONSE_FORMATS,
  toolError,
  toolResult,
  type McpToolResponse,
  type ResponseFormat,
} from "../response.js";
import type { MetronServices } from "../services.js";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const responseFormat = z.enum(RESPONSE_FORMATS).default("markdown");
const featureSchema = {
  collateral_usd: z.string().describe("Collateral value in USD as a decimal string"),
  debt_usd: z.string().describe("Debt value in USD as a decimal string"),
  liquidation_threshold_bps: z.number().int().min(0).max(10_000),
  volatility_bps: z.number().int().min(0).max(1_000_000),
  stablecoin_deviation_bps: z.number().int().min(-1_000_000).max(1_000_000),
  protocol_risk_bps: z.number().int().min(0).max(10_000),
  net_delta_wad: z.number().int(),
  lp_range_drift_bps: z.number().int().min(0).max(1_000_000),
  bridge_pending: z.boolean(),
};
const featureInput = z.object(featureSchema).strict();

type ReadToolContext = {
  services: MetronServices;
  authorizer: McpAuthorizer;
  principal: McpPrincipal;
};

export function registerReadOnlyTools(server: McpServer, context: ReadToolContext): void {
  server.registerTool(
    "metron_position_get",
    {
      title: "Get Metron Position",
      description: "Read one position by ID, including ownership and chain-level components.",
      inputSchema: { position_id: z.string().min(1).max(128), response_format: responseFormat },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ position_id, response_format: format }) =>
      executeRead(context, "Get position", format, async () =>
        context.services.convex("positions.get", { positionId: position_id }),
      ),
  );

  server.registerTool(
    "metron_positions_list_mine",
    {
      title: "List Metron Positions",
      description: "List positions owned by one wallet with a bounded result count.",
      inputSchema: {
        owner_address: z.string().min(1).max(128),
        limit: z.number().int().min(1).max(200).default(50),
        response_format: responseFormat,
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ owner_address, limit, response_format: format }) =>
      executeRead(context, "List positions", format, async () =>
        context.services.convex("positions.listMine", { ownerAddress: owner_address, limit }),
      ),
  );

  server.registerTool(
    "metron_position_timeline",
    {
      title: "Read Position Timeline",
      description: "Read merged execution, risk snapshot, and cross-chain events for a position.",
      inputSchema: {
        position_id: z.string().min(1).max(128),
        limit: z.number().int().min(1).max(200).default(50),
        response_format: responseFormat,
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ position_id, limit, response_format: format }) =>
      executeRead(context, "Position timeline", format, async () =>
        context.services.convex("positions.timeline", { positionId: position_id, limit }),
      ),
  );

  server.registerTool(
    "metron_risk_liquidation",
    {
      title: "Predict Liquidation Risk",
      description:
        "Return bounded liquidation probabilities for requested horizons using the Metron AI service.",
      inputSchema: {
        position_id: z.string().min(1).max(128),
        trace_id: z.string().min(1).max(128),
        features: featureInput,
        horizons_days: z.array(z.number().int().positive().max(3650)).min(1).max(8),
        response_format: responseFormat,
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ position_id, trace_id, features, horizons_days, response_format: format }) =>
      executeRead(context, "Liquidation prediction", format, async () =>
        context.services.ai("v1/risk/liquidation", {
          position_id,
          trace_id,
          features,
          horizons_days,
        }),
      ),
  );

  server.registerTool(
    "metron_risk_regime",
    {
      title: "Classify Market Regime",
      description:
        "Classify the current portfolio market regime and return normalized probabilities.",
      inputSchema: {
        position_id: z.string().min(1).max(128),
        trace_id: z.string().min(1).max(128),
        features: featureInput,
        response_format: responseFormat,
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ position_id, trace_id, features, response_format: format }) =>
      executeRead(context, "Market regime", format, async () =>
        context.services.ai("v1/risk/regime", { position_id, trace_id, features }),
      ),
  );

  server.registerTool(
    "metron_protocol_metrics_latest",
    {
      title: "Read Protocol Metrics",
      description: "Read recent indexed protocol observations with bounded pagination.",
      inputSchema: {
        chain_id: z.number().int().positive(),
        protocol: z.string().min(1).max(128),
        metric: z.string().min(1).max(128),
        limit: z.number().int().min(1).max(200).default(50),
        response_format: responseFormat,
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ chain_id, protocol, metric, limit, response_format: format }) =>
      executeRead(context, "Protocol metrics", format, async () =>
        context.services.convex("protocolMetrics.latest", {
          chainId: chain_id,
          protocol,
          metric,
          limit,
        }),
      ),
  );

  server.registerTool(
    "metron_position_answer",
    {
      title: "Answer Position Question",
      description:
        "Answer a position question only from supplied indexed or simulation data and provenance.",
      inputSchema: {
        trace_id: z.string().min(1).max(128),
        question: z.string().min(1).max(1_000),
        indexed_data: z
          .record(z.string(), z.union([z.string(), z.number()]))
          .refine((value) => Object.keys(value).length > 0, "indexed_data must not be empty"),
        simulation_outputs: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
        response_format: responseFormat,
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ trace_id, question, indexed_data, simulation_outputs, response_format: format }) =>
      executeRead(context, "Position answer", format, async () =>
        context.services.ai("v1/position/answer", {
          trace_id,
          question,
          indexed_data,
          simulation_outputs,
        }),
      ),
  );
}

async function executeRead(
  context: ReadToolContext,
  title: string,
  format: ResponseFormat,
  operation: () => Promise<unknown>,
): Promise<McpToolResponse> {
  try {
    context.authorizer.requireScope(context.principal, "read");
    const payload = objectPayload(await operation());
    return toolResult(payload, format, title);
  } catch (error) {
    return toolError(error);
  }
}

function objectPayload(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return { data: value };
}
