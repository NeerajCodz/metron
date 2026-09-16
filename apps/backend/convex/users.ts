import { v } from "convex/values";

import { mutation, query } from "./_generated/server.js";
import { requireIdentity, requireUser, assertAddress } from "./lib/auth.js";

export const ensure = mutation({
  args: { displayName: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const now = Date.now();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_external_subject", (query) => query.eq("externalSubject", identity.subject))
      .unique();
    if (existing) {
      if (args.displayName === undefined) {
        await ctx.db.patch(existing._id, { updatedAt: now });
      } else {
        await ctx.db.patch(existing._id, { displayName: args.displayName, updatedAt: now });
      }
      return existing._id;
    }
    return args.displayName === undefined
      ? ctx.db.insert("users", {
          externalSubject: identity.subject,
          createdAt: now,
          updatedAt: now,
        })
      : ctx.db.insert("users", {
          externalSubject: identity.subject,
          displayName: args.displayName,
          createdAt: now,
          updatedAt: now,
        });
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireUser(ctx);
    return user;
  },
});

export const registerWallet = mutation({
  args: {
    address: v.string(),
    chainIds: v.array(v.number()),
    label: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx);
    const address = assertAddress(args.address);
    if (
      args.chainIds.length === 0 ||
      args.chainIds.some((chainId) => !Number.isInteger(chainId) || chainId <= 0)
    ) {
      throw new Error("wallet must include positive chain IDs");
    }
    const existing = await ctx.db
      .query("wallets")
      .withIndex("by_address", (query) => query.eq("address", address))
      .unique();
    const now = Date.now();
    if (existing) {
      if (existing.userId !== user._id) throw new Error("wallet belongs to another user");
      if (args.label === undefined) {
        await ctx.db.patch(existing._id, { chainIds: args.chainIds, updatedAt: now });
      } else {
        await ctx.db.patch(existing._id, {
          chainIds: args.chainIds,
          label: args.label,
          updatedAt: now,
        });
      }
      return existing._id;
    }
    return args.label === undefined
      ? ctx.db.insert("wallets", {
          userId: user._id,
          address,
          chainIds: args.chainIds,
          createdAt: now,
          updatedAt: now,
        })
      : ctx.db.insert("wallets", {
          userId: user._id,
          address,
          chainIds: args.chainIds,
          label: args.label,
          createdAt: now,
          updatedAt: now,
        });
  },
});

export const listWallets = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireUser(ctx);
    return ctx.db
      .query("wallets")
      .withIndex("by_user", (query) => query.eq("userId", user._id))
      .collect();
  },
});
