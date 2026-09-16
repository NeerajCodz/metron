import type { McpPrincipal, McpAuthorizer } from "../auth.js";
import {
  RESPONSE_FORMATS,
  toolError,
  toolResult,
  type McpToolResponse,
  type ResponseFormat,
} from "../response.js";
import type { MetronServices, ExecutionRequest } from "../services.js";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const responseFormat = z.enum(RESPONSE_FORMATS).default("markdown");
const featureInput = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]));
const recoveryPolicy = z.object({
  allowed_action_types: z.array(z.string().min(1).max(128)).min(1).max(64),
  max_collateral_sale_bps: z.number().int().min(0).max(10_000),
  max_slippage_bps: z.number().int().min(0).max(10_000),
  allow_hedging: z.boolean().default(true),
  allow_liquidity_withdrawal: z.boolean().default(true),
});
const executionAction = z.object({
  action_type: z.string().min(1).max(128),
  chain_id: z.number().int().positive(),
  protocol: z.string().min(1).max(128),
  asset: z.string().min(1).max(128),
  amount: z.string().min(1).max(128),
  minimum_output: z.string().min(1).max(128).optional(),
});

type ExecuteToolContext = {
  services: MetronServices;
  authorizer: McpAuthorizer;
  principal: McpPrincipal;
};

export function registerExecutionTools(server: McpServer, context: ExecuteToolContext): void {
  server.registerTool(
    "metron_ai_recovery_rank",
    {
      title: "Rank Recovery Actions",
      description:
        "Rank policy-bounded recovery actions without moving funds or submitting transactions.",
      inputSchema: {
        position_id: z.string().min(1).max(128),
        trace_id: z.string().min(1).max(128),
        chain_id: z.number().int().positive(),
        protocol: z.string().min(1).max(128),
        asset: z.string().max(128).optional(),
        features: featureInput,
        policy: recoveryPolicy,
        response_format: responseFormat,
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ response_format: format, ...payload }) => executeRecovery(context, format, payload),
  );

  server.registerTool(
    "metron_execution_submit",
    {
      title: "Submit Approved Execution",
      description:
        "Submit an explicitly approved, policy-bounded action plan to the configured execution gateway.",
      inputSchema: {
        approval_id: z.string().min(1).max(128),
        intent_id: z.string().min(1).max(128),
        position_id: z.string().min(1).max(128),
        trace_id: z.string().min(1).max(128),
        deadline: z.number().int().positive(),
        approved: z
          .literal(true)
          .describe("Must be true; false or omission cannot submit funds-moving actions"),
        actions: z.array(executionAction).min(1).max(64),
        response_format: responseFormat,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ response_format: format, ...payload }) => executeSubmission(context, format, payload),
  );

  server.registerTool(
    "metron_execution_status",
    {
      title: "Read Execution Status",
      description: "Read an execution record from Convex by its idempotent execution key.",
      inputSchema: {
        execution_key: z.string().min(1).max(256),
        response_format: responseFormat,
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ execution_key, response_format: format }) => {
      try {
        context.authorizer.requireScope(context.principal, "read");
        const result = await context.services.convex("executions.getByKey", {
          executionKey: execution_key,
        });
        return toolResult(objectPayload(result), format, "Execution status");
      } catch (error) {
        return toolError(error);
      }
    },
  );
}

async function executeRecovery(
  context: ExecuteToolContext,
  format: ResponseFormat,
  payload: Record<string, unknown>,
): Promise<McpToolResponse> {
  try {
    context.authorizer.requireScope(context.principal, "simulate");
    const result = await context.services.ai("v1/recovery/rank", payload);
    return toolResult(objectPayload(result), format, "Recovery actions");
  } catch (error) {
    return toolError(error);
  }
}

async function executeSubmission(
  context: ExecuteToolContext,
  format: ResponseFormat,
  payload: ExecutionRequest,
): Promise<McpToolResponse> {
  try {
    context.authorizer.requireScope(context.principal, "execute");
    const result = await context.services.execute(payload);
    return toolResult(objectPayload(result), format, "Execution submission");
  } catch (error) {
    return toolError(error);
  }
}

function objectPayload(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : { data: value };
}
