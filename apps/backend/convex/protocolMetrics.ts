import { v } from "convex/values";

import { internalMutation, query } from "./_generated/server.js";

export const record = internalMutation({
  args: {
    chainId: v.number(),
    protocol: v.string(),
    metric: v.string(),
    value: v.string(),
    unit: v.string(),
    blockNumber: v.number(),
    observedAt: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.chainId <= 0 || args.blockNumber < 0 || args.observedAt <= 0) {
      throw new Error("protocol observation coordinates must be positive");
    }
    if (!args.protocol.trim() || !args.metric.trim() || !args.unit.trim()) {
      throw new Error("protocol observation metadata is required");
    }
    if (!args.value.trim()) throw new Error("protocol observation value is required");
    return ctx.db.insert("protocolMetrics", args);
  },
});

export const latest = query({
  args: {
    chainId: v.number(),
    protocol: v.string(),
    metric: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    if (limit < 1 || limit > 200) throw new Error("limit must be between 1 and 200");
    return ctx.db
      .query("protocolMetrics")
      .withIndex("by_protocol_metric", (query) =>
        query.eq("chainId", args.chainId).eq("protocol", args.protocol).eq("metric", args.metric),
      )
      .order("desc")
      .take(limit);
  },
});
