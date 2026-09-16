import type { CanonicalIntent, SolverRoute } from "@metron/types";
import { computeBidCommitment, hashRouteJson, scoreRoute } from "@metron/protocol";
import { canonicalIntentSchema, solverRouteSchema } from "@metron/validation";
import { v } from "convex/values";

import { internalMutation, mutation, query } from "./_generated/server.js";
import type { Id } from "./_generated/dataModel.js";
import { assertAddress, assertBytes32, requireUser } from "./lib/auth.js";

async function assertIntentOwner(ctx: Parameters<typeof requireUser>[0], intentId: Id<"intents">) {
  const { user } = await requireUser(ctx);
  const intent = await ctx.db.get(intentId);
  if (!intent) throw new Error("intent not found");
  const wallets = await ctx.db.query("wallets").withIndex("by_user", (query) => query.eq("userId", user._id)).collect();
  if (!wallets.some((wallet) => wallet.address === intent.ownerAddress)) throw new Error("intent ownership mismatch");
  return { user, intent };
}

export const register = mutation({
  args: {
    solverId: v.string(),
    operatorAddress: v.string(),
    endpoint: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx);
    const operatorAddress = assertAddress(args.operatorAddress);
    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_address", (query) => query.eq("address", operatorAddress))
      .unique();
    if (!wallet || wallet.userId !== user._id) throw new Error("solver operator wallet is not owned by user");
    if (!args.solverId.trim()) throw new Error("solver ID is required");
    const existing = await ctx.db
      .query("solverRegistry")
      .withIndex("by_solver", (query) => query.eq("solverId", args.solverId))
      .unique();
    const now = Date.now();
    if (existing) {
      if (existing.operatorAddress !== operatorAddress) throw new Error("solver ID is registered to another operator");
      await ctx.db.patch(existing._id, { endpoint: args.endpoint, enabled: true, updatedAt: now });
      return existing._id;
    }
    return args.endpoint === undefined
      ? ctx.db.insert("solverRegistry", {
          solverId: args.solverId,
          operatorAddress,
          enabled: true,
          reputationBps: 5_000,
          registeredAt: now,
          updatedAt: now,
        })
      : ctx.db.insert("solverRegistry", {
          solverId: args.solverId,
          operatorAddress,
          endpoint: args.endpoint,
          enabled: true,
          reputationBps: 5_000,
          registeredAt: now,
          updatedAt: now,
        });
  },
});

export const listEnabled = query({
  args: {},
  handler: async (ctx) => ctx.db.query("solverRegistry").withIndex("by_enabled", (query) => query.eq("enabled", true)).collect(),
});

export const commitBid = internalMutation({
  args: {
    intentId: v.id("intents"),
    solverId: v.string(),
    commitment: v.string(),
    traceId: v.string(),
  },
  handler: async (ctx, args) => {
    const commitment = assertBytes32(args.commitment, "solver commitment");
    const traceId = assertBytes32(args.traceId, "traceId");
    const solver = await ctx.db
      .query("solverRegistry")
      .withIndex("by_solver", (query) => query.eq("solverId", args.solverId))
      .unique();
    if (!solver || !solver.enabled) throw new Error("solver is not enabled");
    const intent = await ctx.db.get(args.intentId);
    if (!intent || (intent.status !== "published" && intent.status !== "auctioning")) {
      throw new Error("intent is not accepting solver bids");
    }
    const existing = await ctx.db
      .query("solverBidCommits")
      .withIndex("by_intent_and_solver", (query) => query.eq("intentId", args.intentId).eq("solverId", args.solverId))
      .unique();
    if (existing) throw new Error("solver already committed for intent");
    return ctx.db.insert("solverBidCommits", {
      intentId: args.intentId,
      solverId: args.solverId,
      commitment,
      traceId,
      committedAt: Date.now(),
    });
  },
});

export const revealBid = internalMutation({
  args: {
    intentId: v.id("intents"),
    solverId: v.string(),
    salt: v.string(),
    routeJson: v.string(),
  },
  handler: async (ctx, args) => {
    const salt = assertBytes32(args.salt, "solver salt");
    const commit = await ctx.db
      .query("solverBidCommits")
      .withIndex("by_intent_and_solver", (query) => query.eq("intentId", args.intentId).eq("solverId", args.solverId))
      .unique();
    if (!commit) throw new Error("solver commitment not found");
    const existing = await ctx.db
      .query("solverBidReveals")
      .withIndex("by_intent_and_solver", (query) => query.eq("intentId", args.intentId).eq("solverId", args.solverId))
      .unique();
    if (existing) throw new Error("solver already revealed for intent");

    const routeHash = hashRouteJson(args.routeJson);
    const expectedCommitment = computeBidCommitment(
      hashRouteJson(args.intentId),
      hashRouteJson(args.solverId),
      routeHash,
      salt as `0x${string}`,
    );
    const rejectionReasons: string[] = [];
    if (expectedCommitment.toLowerCase() !== commit.commitment.toLowerCase()) {
      rejectionReasons.push("COMMITMENT_MISMATCH");
    }
    let parsedRoute: SolverRoute | undefined;
    let routePayload: unknown;
    try {
      routePayload = JSON.parse(args.routeJson);
    } catch {
      routePayload = null;
    }
    const routeResult = solverRouteSchema.safeParse(routePayload);
    if (!routeResult.success) {
      rejectionReasons.push("ROUTE_SCHEMA_INVALID");
    } else {
      parsedRoute = routeResult.data as unknown as SolverRoute;
      if (parsedRoute.solverId !== args.solverId) rejectionReasons.push("SOLVER_ID_MISMATCH");
      if (parsedRoute.validityDeadline <= Math.floor(Date.now() / 1000)) rejectionReasons.push("ROUTE_EXPIRED");
    }
    let scoreJson: string | undefined;
    let routeId = "invalid";
    if (parsedRoute && rejectionReasons.length === 0) {
      const intent = await ctx.db.get(args.intentId);
      const version = intent?.currentVersion
        ? await ctx.db
            .query("intentVersions")
            .withIndex("by_intent_and_version", (query) =>
              query.eq("intentId", args.intentId).eq("version", intent.currentVersion),
            )
            .unique()
        : null;
      if (!version) rejectionReasons.push("INTENT_VERSION_MISSING");
      else {
        const canonical = canonicalIntentSchema.parse(JSON.parse(version.canonicalJson)) as unknown as CanonicalIntent;
        const score = scoreRoute(parsedRoute, {
          maximumSlippageBps: BigInt(canonical.risk.maxSlippageBps),
          maximumDrawdownBps: BigInt(canonical.risk.maxDrawdownBps),
          ...(canonical.risk.maxLiquidationProbabilityBps === undefined
            ? {}
            : { maximumLiquidationProbabilityBps: BigInt(canonical.risk.maxLiquidationProbabilityBps) }),
          ...(canonical.risk.maxImpermanentLossBps === undefined
            ? {}
            : { maximumImpermanentLossBps: BigInt(canonical.risk.maxImpermanentLossBps) }),
          targetDeltaWad: BigInt(canonical.exposure.targetDeltaWad),
          deltaToleranceWad: BigInt(canonical.exposure.deltaToleranceWad),
          ...(canonical.risk.minHealthFactorWad === undefined
            ? {}
            : { minimumHealthFactorWad: BigInt(canonical.risk.minHealthFactorWad) }),
        });
        scoreJson = JSON.stringify(score);
        routeId = parsedRoute.routeId;
        if (!score.constraintsSatisfied) rejectionReasons.push(...score.rejectionReasons);
      }
    }
    const traceId = assertBytes32(commit.traceId, "traceId");
    return ctx.db.insert("solverBidReveals", {
      intentId: args.intentId,
      solverId: args.solverId,
      routeId,
      salt,
      routeJson: args.routeJson,
      ...(scoreJson === undefined ? {} : { scoreJson }),
      valid: rejectionReasons.length === 0,
      rejectionReasons,
      revealedAt: Date.now(),
    });
  },
});

export const selectWinner = internalMutation({
  args: { intentId: v.id("intents") },
  handler: async (ctx, args) => {
    const intent = await ctx.db.get(args.intentId);
    if (!intent) throw new Error("intent not found");
    const existing = await ctx.db
      .query("strategies")
      .withIndex("by_intent_and_selected", (query) => query.eq("intentId", args.intentId).eq("selected", true))
      .unique();
    if (existing) return existing._id;
    const reveals = await ctx.db
      .query("solverBidReveals")
      .withIndex("by_intent", (query) => query.eq("intentId", args.intentId))
      .collect();
    const candidates = reveals
      .filter((reveal) => reveal.valid && reveal.scoreJson)
      .sort((left, right) => {
        const leftScore = BigInt(JSON.parse(left.scoreJson!).totalScore);
        const rightScore = BigInt(JSON.parse(right.scoreJson!).totalScore);
        if (leftScore !== rightScore) return leftScore > rightScore ? -1 : 1;
        return left.routeId.localeCompare(right.routeId);
      });
    const winner = candidates[0];
    if (!winner) throw new Error("no valid solver route");
    const route = solverRouteSchema.parse(JSON.parse(winner.routeJson));
    const now = Date.now();
    const strategyId = await ctx.db.insert("strategies", {
      intentId: args.intentId,
      routeId: winner.routeId,
      solverId: winner.solverId,
      scoreVersion: route.scoreVersion,
      routeJson: winner.routeJson,
      scoreJson: winner.scoreJson!,
      selected: true,
      validityDeadline: route.validityDeadline,
      createdAt: now,
    });
    await ctx.db.patch(args.intentId, { status: "auctioning", updatedAt: now });
    return strategyId;
  },
});

export const listForIntent = query({
  args: { intentId: v.id("intents") },
  handler: async (ctx, args) => {
    await assertIntentOwner(ctx, args.intentId);
    return ctx.db.query("strategies").withIndex("by_intent", (query) => query.eq("intentId", args.intentId)).collect();
  },
});
