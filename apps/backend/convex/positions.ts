import { v } from "convex/values";

import { internalMutation, query } from "./_generated/server.js";
import { requireUser } from "./lib/auth.js";
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
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: Date.now() });
      return existing._id;
    }
    return ctx.db.insert("positions", { ...args, updatedAt: Date.now() });
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
    const existing = await ctx.db
      .query("positionComponents")
      .withIndex("by_position_and_component", (query) =>
        query.eq("positionId", args.positionId).eq("componentKey", args.componentKey),
      )
      .unique();
    if (existing) {
      if (args.blockNumber < existing.blockNumber) return existing._id;
      await ctx.db.patch(existing._id, { ...args, updatedAt: Date.now() });
      return existing._id;
    }
    return ctx.db.insert("positionComponents", { ...args, updatedAt: Date.now() });
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
    observedAt: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.liquidationProbabilityBps < 0 || args.liquidationProbabilityBps > 10_000) {
      throw new Error("liquidation probability is outside basis-point bounds");
    }
    const snapshotId = await ctx.db.insert("riskSnapshots", args);
    const position = await ctx.db.get(args.positionId);
    if (position) {
      await ctx.db.patch(args.positionId, {
        healthFactorWad: args.healthFactorWad,
        netDeltaWad: args.netDeltaWad,
        liquidationProbabilityBps: args.liquidationProbabilityBps,
        lastRiskSnapshotId: snapshotId,
        updatedAt: Date.now(),
      });
    }
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

export const timeline = query({
  args: {
    positionId: v.id("positions"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx);
    const wallets = await ctx.db
      .query("wallets")
      .withIndex("by_user", (query) => query.eq("userId", user._id))
      .collect();
    const position = await ctx.db.get(args.positionId);
    if (!position || !wallets.some((wallet) => wallet.address === position.ownerAddress)) {
      return null;
    }
    const limit = args.limit ?? 100;
    if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
      throw new Error("timeline limit must be an integer between 1 and 200");
    }

    const [executions, snapshots, messages] = await Promise.all([
      ctx.db
        .query("executions")
        .withIndex("by_position", (query) => query.eq("positionId", args.positionId))
        .collect(),
      ctx.db
        .query("riskSnapshots")
        .withIndex("by_position", (query) => query.eq("positionId", args.positionId))
        .collect(),
      ctx.db
        .query("crossChainMessages")
        .withIndex("by_position", (query) => query.eq("positionId", args.positionId))
        .collect(),
    ]);

    const events = [
      ...executions.map((execution) => ({
        id: `execution:${execution.executionKey}`,
        type: "execution",
        status: execution.status,
        timestamp: execution.confirmedAt ?? execution.submittedAt ?? execution.updatedAt,
        traceId: execution.traceId,
        details: {
          actionType: execution.actionType,
          chainId: execution.chainId,
          ...(execution.transactionHash === undefined
            ? {}
            : { transactionHash: execution.transactionHash }),
          ...(execution.failureCode === undefined ? {} : { failureCode: execution.failureCode }),
        },
      })),
      ...snapshots.map((snapshot) => ({
        id: `risk:${snapshot._id}`,
        type: "risk_snapshot",
        status: "observed",
        timestamp: snapshot.observedAt,
        traceId: snapshot.traceId,
        details: {
          regime: snapshot.regime,
          netDeltaWad: snapshot.netDeltaWad,
          liquidationProbabilityBps: snapshot.liquidationProbabilityBps,
          stablecoinDeviationBps: snapshot.stablecoinDeviationBps,
          protocolRiskBps: snapshot.protocolRiskBps,
        },
      })),
      ...messages.map((message) => ({
        id: `cross-chain:${message.messageId}`,
        type: "cross_chain",
        status: message.state,
        timestamp: message.updatedAt,
        traceId: message.traceId,
        details: {
          sourceChainId: message.sourceChainId,
          destinationChainId: message.destinationChainId,
          actionType: message.actionType,
          ...(message.failureCode === undefined ? {} : { failureCode: message.failureCode }),
        },
      })),
    ].sort((left, right) => right.timestamp - left.timestamp);

    return events.slice(0, limit);
  },
});
