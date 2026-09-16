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
