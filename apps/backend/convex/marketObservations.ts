import { v } from "convex/values";

import { internalMutation, internalQuery } from "./_generated/server.js";

const quality = v.union(v.literal("valid"), v.literal("stale"), v.literal("invalid"));
const source = v.union(
  v.literal("indexer"),
  v.literal("adapter"),
  v.literal("oracle"),
  v.literal("provider"),
  v.literal("simulation"),
);

function assertDecimal(value: string): void {
  if (!/^(0|[1-9]\d*)(\.\d+)?$/.test(value)) throw new Error("observation value must be a decimal string");
}

export const ingest = internalMutation({
  args: {
    observationId: v.string(),
    schemaVersion: v.literal("market-observation-v1"),
    chainId: v.number(),
    protocol: v.string(),
    metric: v.string(),
    value: v.string(),
    unit: v.string(),
    observedAtMs: v.number(),
    blockNumber: v.number(),
    source,
    sourceReference: v.string(),
    quality,
    traceId: v.string(),
    asset: v.optional(v.string()),
    quoteAsset: v.optional(v.string()),
    pair: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.observationId.trim() || !args.protocol.trim() || !args.metric.trim()) {
      throw new Error("observation identity is required");
    }
    if (!args.sourceReference.trim() || !args.traceId.trim() || !args.unit.trim()) {
      throw new Error("observation provenance is required");
    }
    if (args.chainId <= 0 || args.blockNumber < 0 || !Number.isSafeInteger(args.observedAtMs)) {
      throw new Error("observation coordinates are invalid");
    }
    assertDecimal(args.value);

    const existing = await ctx.db
      .query("marketObservations")
      .withIndex("by_observation", (query) => query.eq("observationId", args.observationId))
      .unique();
    if (existing) {
      const { _id: _existingId, _creationTime: _existingTime, ...existingPayload } = existing;
      const argsPayload = { ...args };
      if (JSON.stringify(existingPayload) !== JSON.stringify(argsPayload)) {
        throw new Error("observation ID already exists with a conflicting payload");
      }
      return existing._id;
    }

    const newer = await ctx.db
      .query("marketObservations")
      .withIndex("by_protocol_metric_time", (query) =>
        query.eq("chainId", args.chainId).eq("protocol", args.protocol).eq("metric", args.metric),
      )
      .order("desc")
      .first();
    if (newer && newer.blockNumber > args.blockNumber) return newer._id;
    return ctx.db.insert("marketObservations", args);
  },
});

export const latest = internalQuery({
  args: {
    chainId: v.number(),
    protocol: v.string(),
    metric: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    if (!Number.isInteger(limit) || limit < 1 || limit > 200) throw new Error("limit must be between 1 and 200");
    return ctx.db
      .query("marketObservations")
      .withIndex("by_protocol_metric_time", (query) =>
        query.eq("chainId", args.chainId).eq("protocol", args.protocol).eq("metric", args.metric),
      )
      .order("desc")
      .take(limit);
  },
});

export const latestByIdentity = internalQuery({
  args: { observationId: v.string() },
  handler: async (ctx, args) =>
    ctx.db
      .query("marketObservations")
      .withIndex("by_observation", (query) => query.eq("observationId", args.observationId))
      .unique(),
});
