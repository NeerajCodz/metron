import { v } from "convex/values";

import type { Id } from "./_generated/dataModel.js";
import { internalMutation, query, type MutationCtx } from "./_generated/server.js";
import { requireUser } from "./lib/auth.js";

async function appendAudit(
  ctx: MutationCtx,
  event: {
    eventId: string;
    eventType: string;
    status: string;
    timestampMs: number;
    traceId: string;
    ownerAddress: string;
    positionId?: string;
    details: Record<string, string | number | boolean | null>;
  },
): Promise<void> {
  const existing = await ctx.db
    .query("auditEvents")
    .withIndex("by_event", (query) => query.eq("eventId", event.eventId))
    .unique();
  if (existing) return;
  await ctx.db.insert("auditEvents", {
    eventId: event.eventId,
    schemaVersion: "audit-event-v1",
    eventType: event.eventType,
    status: event.status,
    timestampMs: event.timestampMs,
    traceId: event.traceId,
    ownerAddress: event.ownerAddress,
    ...(event.positionId === undefined ? {} : { positionId: event.positionId }),
    detailsJson: JSON.stringify(event.details),
  });
}
const positionStatus = v.union(
  v.literal("pending"),
  v.literal("active"),
  v.literal("restricted"),
  v.literal("emergency"),
  v.literal("unwinding"),
  v.literal("closed"),
  v.literal("failed"),
);

const componentType = v.union(
  v.literal("vault"),
  v.literal("lending"),
  v.literal("liquidity"),
  v.literal("hedge"),
  v.literal("cross_chain"),
  v.literal("insurance"),
);
function addDecimalStrings(values: string[]): string {
  const scale = 18;
  const scaled = values.map((value) => {
    const parts = value.split(".");
    const whole = parts[0] ?? "";
    const fraction = parts[1] ?? "";
    if (!/^\d+$/.test(whole) || !/^\d*$/.test(fraction) || fraction.length > scale) {
      throw new Error("position value must be a decimal string with at most 18 decimals");
    }
    return BigInt(whole) * 10n ** BigInt(scale) + BigInt(fraction.padEnd(scale, "0") || "0");
  });
  const total = scaled.reduce((sum, value) => sum + value, 0n);
  const whole = total / 10n ** BigInt(scale);
  const fraction = (total % 10n ** BigInt(scale)).toString().padStart(scale, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

async function reconcilePositionRecord(ctx: MutationCtx, positionId: Id<"positions">) {
  const position = await ctx.db.get(positionId);
  if (!position) throw new Error("position not found");
  const components = await ctx.db
    .query("positionComponents")
    .withIndex("by_position", (query) => query.eq("positionId", positionId))
    .collect();
  const messages = await ctx.db
    .query("crossChainMessages")
    .withIndex("by_position", (query) => query.eq("positionId", positionId))
    .collect();
  const executions = await ctx.db
    .query("executions")
    .withIndex("by_position", (query) => query.eq("positionId", positionId))
    .collect();
  const netValueUsd = addDecimalStrings(components.map((component) => component.valueUsd));
  const netDeltaWad = components.reduce((sum, component) => sum + BigInt(component.deltaWad), 0n).toString();
  const healthFactors = components
    .map((component) => component.healthFactorWad)
    .filter((value): value is string => value !== undefined)
    .map((value) => BigInt(value));
  const latestBlockByChain: Record<string, number> = {};
  for (const component of components) {
    latestBlockByChain[String(component.chainId)] = Math.max(
      latestBlockByChain[String(component.chainId)] ?? 0,
      component.blockNumber,
    );
  }
  const failedBridge = messages.some((message) => message.state === "failed");
  const recoveryBridge = messages.some((message) => message.state === "recovery_required");
  const failedExecution = executions.some((execution) => execution.status === "failed");
  const status = failedBridge || failedExecution
    ? "failed"
    : recoveryBridge
      ? "emergency"
      : components.length > 0
        ? "active"
        : position.status;
  await ctx.db.patch(position._id, {
    netValueUsd,
    netDeltaWad,
    ...(healthFactors.length > 0 ? { healthFactorWad: (healthFactors.reduce((a, b) => a < b ? a : b)).toString() } : {}),
    latestBlockByChain,
    status,
    updatedAt: Date.now(),
  });
  return position._id;
}

export const reconcilePosition = internalMutation({
  args: { positionId: v.id("positions") },
  handler: async (ctx, args) => reconcilePositionRecord(ctx, args.positionId),
});

export const upsertPosition = internalMutation({
  args: {
    intentId: v.id("intents"),
    strategyId: v.id("strategies"),
    ownerAddress: v.string(),
    status: positionStatus,
    coordinationChainId: v.number(),
    netValueUsd: v.string(),
    netDeltaWad: v.string(),
    healthFactorWad: v.optional(v.string()),
    liquidationProbabilityBps: v.optional(v.number()),
    traceId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("positions")
      .withIndex("by_trace", (query) => query.eq("traceId", args.traceId))
      .unique();
    const updatedAt = Date.now();
    const positionId = existing
      ? existing._id
      : await ctx.db.insert("positions", { ...args, latestBlockByChain: {}, updatedAt });
    if (existing) await ctx.db.patch(positionId, { ...args, updatedAt });
    await appendAudit(ctx, {
      eventId: `position:${positionId}:upsert:${args.traceId}`,
      eventType: "component",
      status: "updated",
      timestampMs: updatedAt,
      traceId: args.traceId,
      ownerAddress: args.ownerAddress,
      positionId,
      details: { status: args.status, netValueUsd: args.netValueUsd, netDeltaWad: args.netDeltaWad },
    });
    return positionId;
  },
});

export const upsertComponent = internalMutation({
  args: {
    positionId: v.id("positions"),
    componentKey: v.string(),
    componentType,
    chainId: v.number(),
    protocol: v.string(),
    contractAddress: v.string(),
    assetAddresses: v.array(v.string()),
    valueUsd: v.string(),
    deltaWad: v.string(),
    healthFactorWad: v.optional(v.string()),
    metadataJson: v.string(),
    blockNumber: v.number(),
  },
  handler: async (ctx, args) => {
    try {
      const metadata: unknown = JSON.parse(args.metadataJson);
      if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
        throw new Error("component metadata must be a JSON object");
      }
    } catch {
      throw new Error("component metadata must be valid JSON");
    }
    const existing = await ctx.db
      .query("positionComponents")
      .withIndex("by_position_and_component", (query) =>
        query.eq("positionId", args.positionId).eq("componentKey", args.componentKey),
      )
      .unique();
    if (existing && args.blockNumber < existing.blockNumber) return existing._id;
    const updatedAt = Date.now();
    const componentId = existing
      ? existing._id
      : await ctx.db.insert("positionComponents", { ...args, updatedAt });
    if (existing) await ctx.db.patch(componentId, { ...args, updatedAt });
    const position = await ctx.db.get(args.positionId);
    if (!position) throw new Error("position not found");
    await reconcilePositionRecord(ctx, args.positionId);
    await appendAudit(ctx, {
      eventId: `component:${componentId}:${args.blockNumber}`,
      eventType: "component",
      status: existing ? "updated" : "observed",
      timestampMs: updatedAt,
      traceId: position.traceId,
      ownerAddress: position.ownerAddress,
      positionId: String(args.positionId),
      details: { componentKey: args.componentKey, chainId: args.chainId, blockNumber: args.blockNumber },
    });
    return componentId;
  },
});

export const recordRiskSnapshot = internalMutation({
  args: {
    positionId: v.id("positions"),
    regime: v.string(),
    healthFactorWad: v.optional(v.string()),
    netDeltaWad: v.string(),
    liquidationProbabilityBps: v.number(),
    stablecoinDeviationBps: v.number(),
    protocolRiskBps: v.number(),
    explanationJson: v.string(),
    traceId: v.string(),
    observedAtMs: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.liquidationProbabilityBps < 0 || args.liquidationProbabilityBps > 10_000) {
      throw new Error("liquidation probability is outside basis-point bounds");
    }
    if (!Number.isSafeInteger(args.observedAtMs) || args.observedAtMs < 0) {
      throw new Error("risk observation time must be integer milliseconds");
    }
    const position = await ctx.db.get(args.positionId);
    if (!position) throw new Error("position not found");
    const snapshotId = await ctx.db.insert("riskSnapshots", args);
    await ctx.db.patch(args.positionId, {
      healthFactorWad: args.healthFactorWad,
      netDeltaWad: args.netDeltaWad,
      liquidationProbabilityBps: args.liquidationProbabilityBps,
      lastRiskSnapshotId: snapshotId,
      updatedAt: Date.now(),
    });
    await appendAudit(ctx, {
      eventId: `risk:${snapshotId}`,
      eventType: "risk_snapshot",
      status: "observed",
      timestampMs: args.observedAtMs,
      traceId: args.traceId,
      ownerAddress: position.ownerAddress,
      positionId: String(args.positionId),
      details: { regime: args.regime, liquidationProbabilityBps: args.liquidationProbabilityBps },
    });
    return snapshotId;
  },
});

export const listMine = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx);
    const wallets = await ctx.db
      .query("wallets")
      .withIndex("by_user", (query) => query.eq("userId", user._id))
      .collect();
    const addresses = new Set(wallets.map((wallet) => wallet.address));
    const positions = await ctx.db.query("positions").withIndex("by_owner").collect();
    return positions.filter(
      (position) =>
        addresses.has(position.ownerAddress) && (!args.status || position.status === args.status),
    );
  },
});

export const get = query({
  args: { positionId: v.id("positions") },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx);
    const wallets = await ctx.db
      .query("wallets")
      .withIndex("by_user", (query) => query.eq("userId", user._id))
      .collect();
    const position = await ctx.db.get(args.positionId);
    if (!position || !wallets.some((wallet) => wallet.address === position.ownerAddress))
      return null;
    const components = await ctx.db
      .query("positionComponents")
      .withIndex("by_position", (query) => query.eq("positionId", args.positionId))
      .collect();
    const snapshots = await ctx.db
      .query("riskSnapshots")
      .withIndex("by_position_and_time", (query) => query.eq("positionId", args.positionId))
      .order("desc")
      .take(20);
    return { position, components, snapshots };
  },
});

export const graph = query({
  args: { positionId: v.id("positions") },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx);
    const wallets = await ctx.db
      .query("wallets")
      .withIndex("by_user", (query) => query.eq("userId", user._id))
      .collect();
    const position = await ctx.db.get(args.positionId);
    if (!position || !wallets.some((wallet) => wallet.address === position.ownerAddress)) return null;
    const components = await ctx.db
      .query("positionComponents")
      .withIndex("by_position", (query) => query.eq("positionId", args.positionId))
      .collect();
    const nodes = components.map((component) => {
      let metadata: Record<string, string | number | boolean | null> = {};
      try {
        const parsed: unknown = JSON.parse(component.metadataJson);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          metadata = parsed as Record<string, string | number | boolean | null>;
        }
      } catch {
        metadata = {};
      }
      return {
        nodeId: String(component._id),
        componentType: component.componentType,
        chainId: component.chainId,
        protocol: component.protocol,
        contract: component.contractAddress,
        assets: component.assetAddresses,
        valueUsd: component.valueUsd,
        deltaWad: component.deltaWad,
        ...(component.healthFactorWad === undefined ? {} : { healthFactorWad: component.healthFactorWad }),
        sourceBlockNumber: component.blockNumber,
        sourceObservedAtMs: component.updatedAt,
        metadata,
      };
    });
    return {
      positionId: String(args.positionId),
      schemaVersion: "portfolio-graph-v1" as const,
      nodes,
      edges: [],
      netValueUsd: position.netValueUsd,
      netDeltaWad: position.netDeltaWad,
      ...(position.healthFactorWad === undefined ? {} : { healthFactorWad: position.healthFactorWad }),
      latestBlockByChain: position.latestBlockByChain,
      provenance: { traceIds: [position.traceId], observedAtMs: position.updatedAt, source: "convex" },
    };
  },
});

export const timeline = query({
  args: {
    positionId: v.id("positions"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx);
    const wallets = await ctx.db
      .query("wallets")
      .withIndex("by_user", (query) => query.eq("userId", user._id))
      .collect();
    const position = await ctx.db.get(args.positionId);
    if (!position || !wallets.some((wallet) => wallet.address === position.ownerAddress)) return null;
    const limit = args.limit ?? 100;
    if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
      throw new Error("timeline limit must be an integer between 1 and 200");
    }
    const page = await ctx.db
      .query("auditEvents")
      .withIndex("by_position_time", (query) => query.eq("positionId", String(args.positionId)))
      .order("desc")
      .paginate({ numItems: limit, cursor: args.cursor ?? null });
    return {
      page: page.page.map((event) => {
        let details: Record<string, unknown> = {};
        try {
          const parsed: unknown = JSON.parse(event.detailsJson);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            details = parsed as Record<string, unknown>;
          }
        } catch {
          details = {};
        }
        return {
          eventId: event.eventId,
          schemaVersion: event.schemaVersion,
          eventType: event.eventType,
          status: event.status,
          timestampMs: event.timestampMs,
          traceId: event.traceId,
          ...(event.intentId === undefined ? {} : { intentId: event.intentId }),
          ...(event.positionId === undefined ? {} : { positionId: event.positionId }),
          ...(event.executionKey === undefined ? {} : { executionId: event.executionKey }),
          ...(event.messageId === undefined ? {} : { messageId: event.messageId }),
          details,
        };
      }),
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    };
  },
});
