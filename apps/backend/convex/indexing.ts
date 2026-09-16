import { v } from "convex/values";

import { internalMutation, query } from "./_generated/server.js";

const executionStatus = v.union(
  v.literal("pending"),
  v.literal("submitted"),
  v.literal("confirmed"),
  v.literal("failed"),
  v.literal("expired"),
);

export const upsertExecution = internalMutation({
  args: {
    executionKey: v.string(),
    intentId: v.id("intents"),
    positionId: v.optional(v.id("positions")),
    strategyId: v.optional(v.id("strategies")),
    actionType: v.string(),
    status: executionStatus,
    chainId: v.number(),
    transactionHash: v.optional(v.string()),
    failureCode: v.optional(v.string()),
    traceId: v.string(),
    submittedAt: v.optional(v.number()),
    confirmedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("executions")
      .withIndex("by_execution_key", (query) => query.eq("executionKey", args.executionKey))
      .unique();
    const updatedAt = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        transactionHash: args.transactionHash,
        failureCode: args.failureCode,
        submittedAt: args.submittedAt,
        confirmedAt: args.confirmedAt,
        updatedAt,
      });
      return existing._id;
    }
    return ctx.db.insert("executions", { ...args, updatedAt });
  },
});

export const recordChainTransaction = internalMutation({
  args: {
    chainId: v.number(),
    transactionHash: v.string(),
    blockNumber: v.number(),
    blockHash: v.string(),
    transactionIndex: v.number(),
    status: v.union(v.literal("confirmed"), v.literal("reverted"), v.literal("orphaned")),
    traceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("chainTransactions")
      .withIndex("by_chain_and_hash", (query) =>
        query.eq("chainId", args.chainId).eq("transactionHash", args.transactionHash),
      )
      .unique();
    if (existing) {
      if (existing.blockHash !== args.blockHash) {
        await ctx.db.patch(existing._id, { status: "orphaned", observedAt: Date.now() });
        throw new Error("transaction hash changed block association");
      }
      await ctx.db.patch(existing._id, {
        status: args.status,
        traceId: args.traceId,
        observedAt: Date.now(),
      });
      return existing._id;
    }
    return ctx.db.insert("chainTransactions", { ...args, observedAt: Date.now() });
  },
});

export const advanceCursor = internalMutation({
  args: {
    chainId: v.number(),
    stream: v.string(),
    blockNumber: v.number(),
    blockHash: v.string(),
    confirmations: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.blockNumber < 0 || args.confirmations < 0)
      throw new Error("cursor values must be non-negative");
    const existing = await ctx.db
      .query("indexerCursors")
      .withIndex("by_chain_and_stream", (query) =>
        query.eq("chainId", args.chainId).eq("stream", args.stream),
      )
      .unique();
    if (!existing) return ctx.db.insert("indexerCursors", { ...args, updatedAt: Date.now() });
    if (args.blockNumber < existing.blockNumber) return existing._id;
    if (args.blockNumber === existing.blockNumber && args.blockHash !== existing.blockHash) {
      throw new Error("cursor block hash conflict; reorganization requires rewind");
    }
    await ctx.db.patch(existing._id, { ...args, updatedAt: Date.now() });
    return existing._id;
  },
});

export const rewindCursor = internalMutation({
  args: { chainId: v.number(), stream: v.string(), blockNumber: v.number(), blockHash: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("indexerCursors")
      .withIndex("by_chain_and_stream", (query) =>
        query.eq("chainId", args.chainId).eq("stream", args.stream),
      )
      .unique();
    if (!existing) throw new Error("cursor not found");
    if (args.blockNumber > existing.blockNumber)
      throw new Error("rewind target is ahead of cursor");
    await ctx.db.patch(existing._id, {
      blockNumber: args.blockNumber,
      blockHash: args.blockHash,
      updatedAt: Date.now(),
    });
    return existing._id;
  },
});

export const getCursor = query({
  args: { chainId: v.number(), stream: v.string() },
  handler: async (ctx, args) =>
    ctx.db
      .query("indexerCursors")
      .withIndex("by_chain_and_stream", (query) =>
        query.eq("chainId", args.chainId).eq("stream", args.stream),
      )
      .unique(),
});
