import { v } from "convex/values";

import { internalMutation } from "./_generated/server.js";

export const ingest = internalMutation({
  args: {
    eventId: v.string(),
    schemaVersion: v.literal("audit-event-v1"),
    eventType: v.union(
      v.literal("intent"),
      v.literal("solver"),
      v.literal("execution"),
      v.literal("component"),
      v.literal("risk_snapshot"),
      v.literal("prediction"),
      v.literal("recommendation"),
      v.literal("alert"),
      v.literal("emergency"),
      v.literal("cross_chain"),
    ),
    status: v.string(),
    timestampMs: v.number(),
    traceId: v.string(),
    ownerAddress: v.string(),
    intentId: v.optional(v.string()),
    positionId: v.optional(v.string()),
    executionKey: v.optional(v.string()),
    messageId: v.optional(v.string()),
    detailsJson: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.eventId.trim() || !args.traceId.trim() || !args.ownerAddress.trim()) {
      throw new Error("audit event identity is required");
    }
    if (!Number.isSafeInteger(args.timestampMs) || args.timestampMs < 0) {
      throw new Error("audit timestamp must be non-negative integer milliseconds");
    }
    try {
      const details: unknown = JSON.parse(args.detailsJson);
      if (!details || typeof details !== "object" || Array.isArray(details)) {
        throw new Error("audit details must be an object");
      }
    } catch {
      throw new Error("audit details must be valid JSON");
    }

    const existing = await ctx.db
      .query("auditEvents")
      .withIndex("by_event", (query) => query.eq("eventId", args.eventId))
      .unique();
    if (existing) {
      const { _id: _existingId, _creationTime: _existingTime, ...existingPayload } = existing;
      if (JSON.stringify(existingPayload) !== JSON.stringify(args)) {
        throw new Error("audit event ID already exists with a conflicting payload");
      }
      return existing._id;
    }
    return ctx.db.insert("auditEvents", args);
  },
});
