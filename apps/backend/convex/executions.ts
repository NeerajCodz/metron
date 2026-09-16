import { v } from "convex/values";

import type { Id } from "./_generated/dataModel.js";
import { query, type QueryCtx } from "./_generated/server.js";
import { requireUser } from "./lib/auth.js";
const executionStatus = v.union(
  v.literal("pending"),
  v.literal("submitted"),
  v.literal("confirmed"),
  v.literal("failed"),
  v.literal("expired"),
);

async function ownedPosition(ctx: QueryCtx, positionId: Id<"positions">) {
  const { user } = await requireUser(ctx);
  const wallets = await ctx.db
    .query("wallets")
    .withIndex("by_user", (query) => query.eq("userId", user._id))
    .collect();
  const position = await ctx.db.get(positionId);
  return position && wallets.some((wallet) => wallet.address === position.ownerAddress)
    ? position
    : null;
}
export const getByKey = query({
  args: { executionKey: v.string() },
  handler: async (ctx, args) => {
    const execution = await ctx.db
      .query("executions")
      .withIndex("by_execution_key", (query) => query.eq("executionKey", args.executionKey))
      .unique();
    if (!execution) return null;
    if (execution.positionId !== undefined && !(await ownedPosition(ctx, execution.positionId)))
      return null;
    const intent = await ctx.db.get(execution.intentId);
    if (!intent) return null;
    const { user } = await requireUser(ctx);
    const wallets = await ctx.db
      .query("wallets")
      .withIndex("by_user", (query) => query.eq("userId", user._id))
      .collect();
    return wallets.some((wallet) => wallet.address === intent.ownerAddress) ? execution : null;
  },
});

export const listByPosition = query({
  args: {
    positionId: v.id("positions"),
    status: v.optional(executionStatus),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!(await ownedPosition(ctx, args.positionId))) return null;
    const limit = args.limit ?? 50;
    if (!Number.isInteger(limit) || limit < 1 || limit > 200)
      throw new Error("limit must be between 1 and 200");
    const all = await ctx.db
      .query("executions")
      .withIndex("by_position", (query) => query.eq("positionId", args.positionId))
      .order("desc")
      .collect();
    const filtered =
      args.status === undefined ? all : all.filter((execution) => execution.status === args.status);
    const offset = args.cursor === undefined ? 0 : Number.parseInt(args.cursor, 10);
    if (!Number.isSafeInteger(offset) || offset < 0) throw new Error("invalid execution cursor");
    const page = filtered.slice(offset, offset + limit);
    const next = offset + page.length;
    return { page, isDone: next >= filtered.length, continueCursor: String(next) };
  },
});

export const listMine = query({
  args: {
    status: v.optional(executionStatus),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx);
    const wallets = await ctx.db
      .query("wallets")
      .withIndex("by_user", (query) => query.eq("userId", user._id))
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
    const all = await ctx.db.query("executions").collect();
    const filtered = all
      .filter(
        (execution) =>
          intentIds.has(execution.intentId) ||
          (execution.positionId !== undefined && positionIds.has(execution.positionId)),
      )
      .filter((execution) => args.status === undefined || execution.status === args.status)
      .sort((left, right) => right.updatedAt - left.updatedAt);
    const limit = args.limit ?? 50;
    if (!Number.isInteger(limit) || limit < 1 || limit > 200)
      throw new Error("limit must be between 1 and 200");
    const offset = args.cursor === undefined ? 0 : Number.parseInt(args.cursor, 10);
    if (!Number.isSafeInteger(offset) || offset < 0) throw new Error("invalid execution cursor");
    const page = filtered.slice(offset, offset + limit);
    const next = offset + page.length;
    return { page, isDone: next >= filtered.length, continueCursor: String(next) };
  },
});
