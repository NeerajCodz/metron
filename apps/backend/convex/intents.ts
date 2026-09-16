import type { CanonicalIntent } from "@metron/types";
import type { Id } from "./_generated/dataModel.js";
import { canonicalIntentSchema } from "@metron/validation";
import { normalizeIntent, hashNormalizedIntent } from "@metron/protocol";
import { v } from "convex/values";

import { mutation, query } from "./_generated/server.js";
import { assertAddress, assertBytes32, requireUser } from "./lib/auth.js";
async function assertWalletOwner(ctx: Parameters<typeof requireUser>[0], walletId: Id<"wallets">, address: string) {
  const { user } = await requireUser(ctx);
  const wallet = await ctx.db.get(walletId);
  if (!wallet || wallet.userId !== user._id || wallet.address !== address) throw new Error("wallet ownership mismatch");
  return { user, wallet };
}

export const createDraft = mutation({
  args: {
    ownerAddress: v.string(),
    walletId: v.id("wallets"),
    commitment: v.string(),
    traceId: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const ownerAddress = assertAddress(args.ownerAddress);
    await assertWalletOwner(ctx, args.walletId, ownerAddress);
    const commitment = assertBytes32(args.commitment, "commitment");
    const traceId = assertBytes32(args.traceId, "traceId");
    if (!Number.isInteger(args.expiresAt) || args.expiresAt <= Math.floor(Date.now() / 1000)) {
      throw new Error("intent expiry must be in the future");
    }
    const duplicate = await ctx.db
      .query("intents")
      .withIndex("by_trace", (query) => query.eq("traceId", traceId))
      .unique();
    if (duplicate) throw new Error("trace ID already exists");
    const now = Date.now();
    return ctx.db.insert("intents", {
      ownerAddress,
      walletId: args.walletId,
      status: "draft",
      currentVersion: 0,
      commitment,
      traceId,
      expiresAt: args.expiresAt,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const publish = mutation({
  args: {
    intentId: v.id("intents"),
    canonicalJson: v.string(),
  },
  handler: async (ctx, args) => {
    const intent = await ctx.db.get(args.intentId);
    if (!intent) throw new Error("intent not found");
    if (!intent.walletId) throw new Error("intent has no wallet owner");
    await assertWalletOwner(ctx, intent.walletId, intent.ownerAddress);
    if (intent.status !== "draft") throw new Error("only draft intents can be published");
    let decoded: unknown;
    try {
      decoded = JSON.parse(args.canonicalJson);
    } catch {
      throw new Error("canonical intent JSON is invalid");
    }
    const parsed = canonicalIntentSchema.parse(decoded);
    const canonical = normalizeIntent(parsed as unknown as CanonicalIntent);
    if (canonical.owner !== intent.ownerAddress) throw new Error("canonical owner does not match intent owner");
    if (canonical.expiresAt !== intent.expiresAt) throw new Error("canonical expiry does not match intent");
    const canonicalHash = hashNormalizedIntent(canonical);
    const now = Date.now();
    const versionId = await ctx.db.insert("intentVersions", {
      intentId: args.intentId,
      version: 1,
      schemaVersion: canonical.schemaVersion,
      canonicalJson: JSON.stringify(canonical),
      commitment: intent.commitment,
      createdBy: intent.ownerAddress,
      createdAt: now,
    });
    await ctx.db.patch(args.intentId, {
      status: "published",
      currentVersion: 1,
      publishedAt: now,
      updatedAt: now,
    });
    return { intentId: args.intentId, versionId, canonicalHash };
  },
});

export const cancel = mutation({
  args: { intentId: v.id("intents") },
  handler: async (ctx, args) => {
    const intent = await ctx.db.get(args.intentId);
    if (!intent) throw new Error("intent not found");
    if (!intent.walletId) throw new Error("intent has no wallet owner");
    await assertWalletOwner(ctx, intent.walletId, intent.ownerAddress);
    if (intent.status === "settled" || intent.status === "cancelled" || intent.status === "expired") {
      throw new Error("intent is terminal");
    }
    await ctx.db.patch(args.intentId, { status: "cancelled", updatedAt: Date.now() });
    return args.intentId;
  },
});

export const get = query({
  args: { intentId: v.id("intents") },
  handler: async (ctx, args) => {
    const intent = await ctx.db.get(args.intentId);
    if (!intent) return null;
    const version = intent.currentVersion
      ? await ctx.db
          .query("intentVersions")
          .withIndex("by_intent_and_version", (query) =>
            query.eq("intentId", args.intentId).eq("version", intent.currentVersion),
          )
          .unique()
      : null;
    return { intent, version };
  },
});

export const listMine = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx);
    const wallets = await ctx.db.query("wallets").withIndex("by_user", (query) => query.eq("userId", user._id)).collect();
    const addresses = new Set(wallets.map((wallet) => wallet.address));
    const intents = await ctx.db.query("intents").withIndex("by_owner").collect();
    return intents.filter((intent) => addresses.has(intent.ownerAddress) && (!args.status || intent.status === args.status));
  },
});
