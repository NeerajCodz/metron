import { v } from "convex/values";

import type { Id } from "./_generated/dataModel.js";
import { internalMutation, query, type MutationCtx, type QueryCtx } from "./_generated/server.js";
import { requireUser } from "./lib/auth.js";

const state = v.union(
  v.literal("created"),
  v.literal("source_locked"),
  v.literal("message_sent"),
  v.literal("destination_received"),
  v.literal("destination_executed"),
  v.literal("ack_sent"),
  v.literal("confirmed"),
  v.literal("expired"),
  v.literal("failed"),
  v.literal("recovery_required"),
);
type LifecycleState =
  | "created"
  | "source_locked"
  | "message_sent"
  | "destination_received"
  | "destination_executed"
  | "ack_sent"
  | "confirmed"
  | "expired"
  | "failed"
  | "recovery_required";

const transitions: Record<LifecycleState, readonly LifecycleState[]> = {
  created: ["source_locked", "failed", "expired"],
  source_locked: ["message_sent", "failed", "expired"],
  message_sent: ["destination_received", "failed", "expired", "recovery_required"],
  destination_received: ["destination_executed", "failed", "recovery_required"],
  destination_executed: ["ack_sent", "failed", "recovery_required"],
  ack_sent: ["confirmed", "failed", "recovery_required"],
  confirmed: [],
  failed: ["recovery_required"],
  expired: ["recovery_required"],
  recovery_required: ["message_sent"],
};

async function appendAudit(
  ctx: MutationCtx,
  message: {
    messageId: string;
    state: LifecycleState;
    traceId: string;
    positionId?: string;
    intentId?: string;
    failureCode?: string;
    transactionHash?: string;
  },
): Promise<void> {
  const eventId = `cross-chain:${message.messageId}:${message.state}:${message.traceId}`;
  const existing = await ctx.db
    .query("auditEvents")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .unique();
  if (existing) return;
  let ownerAddress = "internal";
  if (message.positionId !== undefined) {
    const position = await ctx.db.get(message.positionId as Id<"positions">);
    if (position) ownerAddress = position.ownerAddress;
  } else if (message.intentId !== undefined) {
    const intent = await ctx.db.get(message.intentId as Id<"intents">);
    if (intent) ownerAddress = intent.ownerAddress;
  }
  await ctx.db.insert("auditEvents", {
    eventId,
    schemaVersion: "audit-event-v1",
    eventType: "cross_chain",
    status: message.state,
    timestampMs: Date.now(),
    traceId: message.traceId,
    ownerAddress,
    ...(message.intentId === undefined ? {} : { intentId: message.intentId }),
    ...(message.positionId === undefined ? {} : { positionId: message.positionId }),
    messageId: message.messageId,
    detailsJson: JSON.stringify({
      messageId: message.messageId,
      ...(message.failureCode === undefined ? {} : { failureCode: message.failureCode }),
      ...(message.transactionHash === undefined
        ? {}
        : { transactionHash: message.transactionHash }),
    }),
  });
}

export const create = internalMutation({
  args: {
    messageId: v.string(),
    messageVersion: v.number(),
    sourceChainId: v.number(),
    destinationChainId: v.number(),
    sourceContract: v.string(),
    destinationContract: v.string(),
    intentId: v.optional(v.id("intents")),
    positionId: v.optional(v.id("positions")),
    actionType: v.string(),
    payloadHash: v.string(),
    nonce: v.string(),
    expiry: v.number(),
    traceId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.messageId.trim() || !args.payloadHash.trim() || args.expiry <= 0)
      throw new Error("invalid cross-chain message");
    const existing = await ctx.db
      .query("crossChainMessages")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .unique();
    if (existing) {
      const comparable = {
        messageId: args.messageId,
        messageVersion: args.messageVersion,
        sourceChainId: args.sourceChainId,
        destinationChainId: args.destinationChainId,
        sourceContract: args.sourceContract,
        destinationContract: args.destinationContract,
        intentId: args.intentId,
        positionId: args.positionId,
        actionType: args.actionType,
        payloadHash: args.payloadHash,
        nonce: args.nonce,
        expiry: args.expiry,
        traceId: args.traceId,
      };
      const current = {
        messageId: existing.messageId,
        messageVersion: existing.messageVersion,
        sourceChainId: existing.sourceChainId,
        destinationChainId: existing.destinationChainId,
        sourceContract: existing.sourceContract,
        destinationContract: existing.destinationContract,
        intentId: existing.intentId,
        positionId: existing.positionId,
        actionType: existing.actionType,
        payloadHash: existing.payloadHash,
        nonce: existing.nonce,
        expiry: existing.expiry,
        traceId: existing.traceId,
      };
      if (JSON.stringify(current) !== JSON.stringify(comparable))
        throw new Error("message ID conflicts with existing payload");
      return existing._id;
    }
    const updatedAt = Date.now();
    const messageId = await ctx.db.insert("crossChainMessages", {
      ...args,
      state: "created",
      updatedAt,
    });
    await appendAudit(ctx, {
      messageId: args.messageId,
      state: "created",
      traceId: args.traceId,
      ...(args.positionId === undefined ? {} : { positionId: String(args.positionId) }),
      ...(args.intentId === undefined ? {} : { intentId: String(args.intentId) }),
    });
    return messageId;
  },
});

export const transition = internalMutation({
  args: {
    messageId: v.string(),
    to: state,
    traceId: v.string(),
    transactionHash: v.optional(v.string()),
    failureCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db
      .query("crossChainMessages")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .unique();
    if (!message) throw new Error("cross-chain message not found");
    if (!transitions[message.state].includes(args.to))
      throw new Error(`illegal cross-chain transition ${message.state} -> ${args.to}`);
    if (
      (args.to === "failed" || args.to === "recovery_required") &&
      !args.failureCode &&
      !message.failureCode
    ) {
      throw new Error("failure and recovery states require a failure code");
    }
    const updatedAt = Date.now();
    await ctx.db.patch(message._id, {
      state: args.to,
      updatedAt,
      ...(args.transactionHash === undefined
        ? {}
        : { destinationTransactionHash: args.transactionHash }),
      ...(args.failureCode === undefined ? {} : { failureCode: args.failureCode }),
    });
    await appendAudit(ctx, {
      messageId: args.messageId,
      state: args.to,
      traceId: args.traceId,
      ...(message.positionId === undefined ? {} : { positionId: String(message.positionId) }),
      ...(message.intentId === undefined ? {} : { intentId: String(message.intentId) }),
      ...(args.failureCode === undefined ? {} : { failureCode: args.failureCode }),
      ...(args.transactionHash === undefined ? {} : { transactionHash: args.transactionHash }),
    });
    return message._id;
  },
});

export const retry = internalMutation({
  args: { messageId: v.string(), payloadHash: v.string(), traceId: v.string() },
  handler: async (ctx, args) => {
    const message = await ctx.db
      .query("crossChainMessages")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .unique();
    if (!message || message.state !== "recovery_required")
      throw new Error("message is not recovery-required");
    if (message.payloadHash !== args.payloadHash) throw new Error("retry payload hash mismatch");
    await ctx.db.patch(message._id, {
      state: "message_sent",
      updatedAt: Date.now(),
      failureCode: undefined,
    });
    await appendAudit(ctx, {
      messageId: args.messageId,
      state: "message_sent",
      traceId: args.traceId,
      ...(message.positionId === undefined ? {} : { positionId: String(message.positionId) }),
      ...(message.intentId === undefined ? {} : { intentId: String(message.intentId) }),
    });
    return message._id;
  },
});

async function ownedMessage(
  ctx: QueryCtx,
  message: { intentId?: Id<"intents">; positionId?: Id<"positions"> },
) {
  const { user } = await requireUser(ctx);
  const wallets = await ctx.db
    .query("wallets")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .collect();
  if (message.positionId !== undefined) {
    const position = await ctx.db.get(message.positionId);
    return Boolean(position && wallets.some((wallet) => wallet.address === position.ownerAddress));
  }
  if (message.intentId !== undefined) {
    const intent = await ctx.db.get(message.intentId);
    return Boolean(intent && wallets.some((wallet) => wallet.address === intent.ownerAddress));
  }
  return false;
}

export const get = query({
  args: { messageId: v.string() },
  handler: async (ctx, args) => {
    const message = await ctx.db
      .query("crossChainMessages")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .unique();
    return message && (await ownedMessage(ctx, message)) ? message : null;
  },
});

export const listMine = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx);
    const wallets = await ctx.db
      .query("wallets")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const addresses = new Set(wallets.map((wallet) => wallet.address));
    const [intents, positions] = await Promise.all([
      ctx.db.query("intents").withIndex("by_owner").collect(),
      ctx.db.query("positions").withIndex("by_owner").collect(),
    ]);
    const intentIds = new Set(
      intents.filter((intent) => addresses.has(intent.ownerAddress)).map((intent) => intent._id),
    );
    const positionIds = new Set(
      positions
        .filter((position) => addresses.has(position.ownerAddress))
        .map((position) => position._id),
    );
    const limit = args.limit ?? 50;
    if (!Number.isInteger(limit) || limit < 1 || limit > 200)
      throw new Error("limit must be between 1 and 200");
    return (await ctx.db.query("crossChainMessages").collect())
      .filter(
        (message) =>
          (message.positionId !== undefined && positionIds.has(message.positionId)) ||
          (message.intentId !== undefined && intentIds.has(message.intentId)),
      )
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .slice(0, limit);
  },
});

export const listRecoveryRequired = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("crossChainMessages")
      .withIndex("by_state", (q) => q.eq("state", "recovery_required"))
      .collect();
    const result = [];
    for (const message of messages) if (await ownedMessage(ctx, message)) result.push(message);
    const limit = args.limit ?? 50;
    if (!Number.isInteger(limit) || limit < 1 || limit > 200)
      throw new Error("limit must be between 1 and 200");
    return result.sort((left, right) => right.updatedAt - left.updatedAt).slice(0, limit);
  },
});
