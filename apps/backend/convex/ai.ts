import { v } from "convex/values";

import { internalMutation, internalQuery } from "./_generated/server.js";

export const recordPrediction = internalMutation({
  args: {
    positionId: v.optional(v.id("positions")),
    predictionType: v.string(),
    requestSchemaVersion: v.string(),
    responseSchemaVersion: v.string(),
    modelVersion: v.string(),
    featureSchemaVersion: v.string(),
    requestJson: v.string(),
    responseJson: v.string(),
    confidenceBps: v.optional(v.number()),
    fallbackUsed: v.boolean(),
    fallbackReason: v.optional(v.string()),
    predictionSource: v.optional(
      v.union(v.literal("model"), v.literal("deterministic"), v.literal("mixed")),
    ),
    datasetFingerprint: v.optional(v.string()),
    featureFingerprint: v.optional(v.string()),
    artifactVersion: v.optional(v.string()),
    latencyMs: v.optional(v.number()),
    traceId: v.string(),
    generatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    if (
      args.confidenceBps !== undefined &&
      (args.confidenceBps < 0 || args.confidenceBps > 10_000)
    ) {
      throw new Error("confidence is outside basis-point bounds");
    }
    if (
      args.latencyMs !== undefined &&
      (!Number.isSafeInteger(args.latencyMs) || args.latencyMs < 0)
    ) {
      throw new Error("latency must be a non-negative integer");
    }
    const existing = await ctx.db
      .query("aiPredictions")
      .withIndex("by_trace", (q) => q.eq("traceId", args.traceId))
      .unique();
    if (existing) {
      if (
        existing.responseJson !== args.responseJson ||
        existing.predictionType !== args.predictionType
      ) {
        throw new Error("trace-linked prediction conflicts with existing inference");
      }
      return existing._id;
    }
    return ctx.db.insert("aiPredictions", args);
  },
});

export const listByTrace = internalQuery({
  args: { traceId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("aiPredictions")
      .withIndex("by_trace", (query) => query.eq("traceId", args.traceId))
      .collect();
  },
});
