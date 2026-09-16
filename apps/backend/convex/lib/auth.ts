import type { QueryCtx, MutationCtx } from "../_generated/server.js";

export type AuthContext = QueryCtx | MutationCtx;

export async function requireIdentity(ctx: AuthContext) {
  const identity = await ctx.auth.getUserIdentity();
  const subject = identity?.subject;
  if (!subject) throw new Error("authentication required");
  return { ...identity, subject };
}

export async function requireUser(ctx: AuthContext) {
  const identity = await requireIdentity(ctx);
  const user = await ctx.db
    .query("users")
    .withIndex("by_external_subject", (query) => query.eq("externalSubject", identity.subject))
    .unique();
  if (!user) throw new Error("user profile not initialized");
  return { identity, user };
}

export function assertAddress(address: string): string {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) throw new Error("invalid EVM address");
  return address.toLowerCase();
}

export function assertBytes32(value: string, field: string): string {
  if (!/^0x[0-9a-fA-F]{64}$/.test(value)) throw new Error(`invalid ${field}`);
  return value.toLowerCase();
}
