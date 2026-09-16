import { v } from "convex/values";

import type { Id } from "./_generated/dataModel.js";
import { internalMutation, query } from "./_generated/server.js";
import type { MutationCtx } from "./_generated/server.js";

const executionStatus = v.union(
  v.literal("pending"),
  v.literal("submitted"),
  v.literal("confirmed"),
  v.literal("failed"),
  v.literal("expired"),
);

const terminalStatuses = new Set(["confirmed", "failed", "expired"]);
const legalTransitions: Record<string, readonly string[]> = {
  pending: ["pending", "submitted", "failed", "expired"],
  submitted: ["submitted", "confirmed", "failed", "expired"],
  confirmed: ["confirmed"],
  failed: ["failed"],
  expired: ["expired"],
};

async function appendExecutionAudit(
  ctx: MutationCtx,
  execution: {
    executionKey: string;
    intentId: string;
    positionId?: string;
    status: string;
    traceId: string;
    transactionHash?: string;
    failureCode?: string;
  },
): Promise<void> {
  const eventId = `execution:${execution.executionKey}:${execution.status}`;
  const existing = await ctx.db
    .query("auditEvents")
    .withIndex("by_event", (query) => query.eq("eventId", eventId))
    .unique();
  if (existing) return;
  let ownerAddress = "internal";
  if (execution.positionId !== undefined) {
    const position = await ctx.db.get(execution.positionId as Id<"positions">);
    if (position) ownerAddress = position.ownerAddress;
  } else {
    const intent = await ctx.db.get(execution.intentId as Id<"intents">);
    if (intent) ownerAddress = intent.ownerAddress;
  }
  await ctx.db.insert("auditEvents", {
    eventId,
    schemaVersion: "audit-event-v1",
    eventType: "execution",
    status: execution.status,
    timestampMs: Date.now(),
    traceId: execution.traceId,
    ownerAddress,
    intentId: execution.intentId,
    ...(execution.positionId === undefined ? {} : { positionId: execution.positionId }),
    executionKey: execution.executionKey,
    detailsJson: JSON.stringify({
      executionId: execution.executionKey,
      ...(execution.transactionHash === undefined
        ? {}
        : { transactionHash: execution.transactionHash }),
      ...(execution.failureCode === undefined ? {} : { failureCode: execution.failureCode }),
    }),
  });
}
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
    if (
      args.status === "pending" &&
      (args.submittedAt !== undefined || args.confirmedAt !== undefined)
    ) {
      throw new Error("pending execution cannot have submission timestamps");
    }
    if (args.status === "submitted" && args.submittedAt === undefined) {
      throw new Error("submitted execution requires submittedAt");
    }
    if (
      args.status === "confirmed" &&
      (args.submittedAt === undefined || args.confirmedAt === undefined)
    ) {
      throw new Error("confirmed execution requires submittedAt and confirmedAt");
    }
    if (
      args.confirmedAt !== undefined &&
      args.submittedAt !== undefined &&
      args.confirmedAt < args.submittedAt
    ) {
      throw new Error("confirmedAt must not precede submittedAt");
    }
    if (existing) {
      if (
        existing.intentId !== args.intentId ||
        existing.positionId !== args.positionId ||
        existing.strategyId !== args.strategyId ||
        existing.actionType !== args.actionType ||
        existing.chainId !== args.chainId ||
        existing.traceId !== args.traceId
      ) {
        throw new Error("execution linkage is immutable");
      }
      if (!legalTransitions[existing.status]?.includes(args.status)) {
        throw new Error(`illegal execution transition ${existing.status} -> ${args.status}`);
      }
      if (terminalStatuses.has(existing.status)) {
        if (
          existing.status !== args.status ||
          existing.transactionHash !== args.transactionHash ||
          existing.failureCode !== args.failureCode
        ) {
          throw new Error("terminal execution status cannot be changed");
        }
        return existing._id;
      }
      if (
        existing.status === args.status &&
        existing.transactionHash === args.transactionHash &&
        existing.failureCode === args.failureCode &&
        existing.submittedAt === args.submittedAt &&
        existing.confirmedAt === args.confirmedAt
      )
        return existing._id;
      await ctx.db.patch(existing._id, {
        status: args.status,
        transactionHash: args.transactionHash,
        failureCode: args.failureCode,
        submittedAt: args.submittedAt,
        confirmedAt: args.confirmedAt,
        updatedAt,
      });
      await appendExecutionAudit(ctx, {
        executionKey: args.executionKey,
        intentId: String(args.intentId),
        ...(args.positionId === undefined ? {} : { positionId: String(args.positionId) }),
        status: args.status,
        traceId: args.traceId,
        ...(args.transactionHash === undefined ? {} : { transactionHash: args.transactionHash }),
        ...(args.failureCode === undefined ? {} : { failureCode: args.failureCode }),
      });
      return existing._id;
    }
    const executionId = await ctx.db.insert("executions", { ...args, updatedAt });
    await appendExecutionAudit(ctx, {
      executionKey: args.executionKey,
      intentId: String(args.intentId),
      ...(args.positionId === undefined ? {} : { positionId: String(args.positionId) }),
      status: args.status,
      traceId: args.traceId,
      ...(args.transactionHash === undefined ? {} : { transactionHash: args.transactionHash }),
      ...(args.failureCode === undefined ? {} : { failureCode: args.failureCode }),
    });
    return executionId;
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
        await ctx.db.patch(existing._id, { status: "orphaned", observedAtMs: Date.now() });
        throw new Error("transaction hash changed block association");
      }
      await ctx.db.patch(existing._id, {
        blockNumber: args.blockNumber,
        blockHash: args.blockHash,
        status: args.status,
        traceId: args.traceId,
        observedAtMs: Date.now(),
      });
      return existing._id;
    }
    return ctx.db.insert("chainTransactions", { ...args, observedAtMs: Date.now() });
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
