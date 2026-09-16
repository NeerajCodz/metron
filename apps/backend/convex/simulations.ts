import { v } from "convex/values";

import { internalMutation, internalQuery, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server.js";
import type { Doc } from "./_generated/dataModel.js";
import { requireUser } from "./lib/auth.js";

const MAX_ID_LENGTH = 128;
const MAX_ROLE_LENGTH = 128;
const MAX_PROVIDER_LENGTH = 128;
const MAX_MODEL_LENGTH = 256;
const MAX_EVENT_TYPE_LENGTH = 128;
const MAX_JSON_LENGTH = 64_000;
const MAX_OUTPUT_LENGTH = 16_000;
const MAX_RATIONALE_LENGTH = 16_000;
const MAX_PARTICIPANTS = 64;
const MAX_TURNS = 200;
const MAX_PROPOSALS_PER_SESSION = 256;
const MAX_OBSERVATIONS = 128;

const participantType = v.union(v.literal("deterministic_bot"), v.literal("ai_agent"));
const participantInput = v.object({
  participantId: v.string(),
  participantType,
  role: v.string(),
  displayName: v.optional(v.string()),
  provider: v.optional(v.string()),
  model: v.optional(v.string()),
  toolsJson: v.optional(v.string()),
  configJson: v.optional(v.string()),
  traceId: v.optional(v.string()),
});

const startFields = {
  sessionId: v.string(),
  ownerSubject: v.optional(v.string()),
  ownerAddress: v.optional(v.string()),
  scenarioJson: v.string(),
  traceId: v.string(),
  idempotencyKey: v.string(),
  maxParticipants: v.optional(v.number()),
  maxTurns: v.optional(v.number()),
  coordinatorProvider: v.optional(v.string()),
  coordinatorModel: v.optional(v.string()),
  observationIds: v.optional(v.array(v.string())),
  participants: v.optional(v.array(participantInput)),
};

const turnFields = {
  ownerSubject: v.optional(v.string()),
  sessionId: v.string(),
  eventId: v.string(),
  idempotencyKey: v.string(),
  turn: v.number(),
  participantId: v.string(),
  traceId: v.optional(v.string()),
  eventType: v.optional(v.string()),
  inputJson: v.optional(v.string()),
  outputJson: v.optional(v.string()),
  observationIds: v.optional(v.array(v.string())),
  resultJson: v.optional(v.string()),
};

const proposalFields = {
  ownerSubject: v.optional(v.string()),
  sessionId: v.string(),
  solverId: v.optional(v.string()),
  proposalId: v.string(),
  participantId: v.optional(v.string()),
  proposalType: v.string(),
  provider: v.string(),
  model: v.string(),
  proposalJson: v.string(),
  rationaleJson: v.optional(v.string()),
  status: v.optional(v.union(v.literal("pending"), v.literal("accepted"), v.literal("rejected"))),
  traceId: v.optional(v.string()),
  idempotencyKey: v.string(),
  observationIds: v.optional(v.array(v.string())),
};

type ParticipantInput = {
  participantId: string;
  participantType: "deterministic_bot" | "ai_agent";
  role: string;
  displayName?: string;
  provider?: string;
  model?: string;
  toolsJson?: string;
  configJson?: string;
  traceId?: string;
};

type StartInput = {
  sessionId: string;
  ownerSubject?: string;
  ownerAddress?: string;
  scenarioJson: string;
  traceId: string;
  idempotencyKey: string;
  maxParticipants?: number;
  maxTurns?: number;
  coordinatorProvider?: string;
  coordinatorModel?: string;
  observationIds?: string[];
  participants?: ParticipantInput[];
};

type TurnInput = {
  ownerSubject?: string;
  sessionId: string;
  eventId: string;
  idempotencyKey: string;
  turn: number;
  participantId: string;
  traceId?: string;
  eventType?: string;
  inputJson?: string;
  outputJson?: string;
  observationIds?: string[];
  resultJson?: string;
};

type ProposalInput = {
  solverId?: string;
  ownerSubject?: string;
  sessionId: string;
  proposalId: string;
  participantId?: string;
  proposalType: string;
  provider: string;
  model: string;
  proposalJson: string;
  rationaleJson?: string;
  status?: "pending" | "accepted" | "rejected";
  traceId?: string;
  idempotencyKey: string;
  observationIds?: string[];
};

function assertText(value: string, field: string, maxLength: number): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > maxLength) {
    throw new Error(`${field} is required and must be at most ${maxLength} characters`);
  }
  return value;
}

function assertId(value: string, field: string): string {
  assertText(value, field, MAX_ID_LENGTH);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)) throw new Error(`${field} has invalid characters`);
  return value;
}

function assertNoSigningFields(value: unknown, path = "input", depth = 0): void {
  if (depth > 20) throw new Error(`${path} is too deeply nested`);
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoSigningFields(item, `${path}[${index}]`, depth + 1));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value)) {
    if (/(private[._-]?key|secret[._-]?key|signing|signature|signed|signer|mnemonic|seed[._-]?phrase|keystore)/i.test(key)) {
      throw new Error(`${path}.${key} is not permitted; simulations cannot sign or hold private keys`);
    }
    assertNoSigningFields(nested, `${path}.${key}`, depth + 1);
  }
}

export function rejectSigningFields(value: unknown): void {
  assertNoSigningFields(value);
}

function parseJson(value: string, field: string, maxLength: number): unknown {
  assertText(value, field, maxLength);
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(`${field} must be valid JSON`);
  }
  assertNoSigningFields(parsed, field);
  return parsed;
}

function observationIds(value: string[] | undefined): string[] {
  const ids = value ?? [];
  if (ids.length > MAX_OBSERVATIONS) throw new Error(`at most ${MAX_OBSERVATIONS} observation IDs are allowed`);
  return ids.map((id, index) => assertId(id, `observationIds[${index}]`));
}

function modelMetadata(provider: string | undefined, model: string | undefined, required: boolean): void {
  if (!required && provider === undefined && model === undefined) return;
  if (provider === undefined || model === undefined) throw new Error("provider and model are both required");
  assertText(provider, "provider", MAX_PROVIDER_LENGTH);
  assertText(model, "model", MAX_MODEL_LENGTH);
}

function limits(maxParticipants: number | undefined, maxTurns: number | undefined): { maxParticipants: number; maxTurns: number } {
  const participants = maxParticipants ?? 16;
  const turns = maxTurns ?? 24;
  if (!Number.isSafeInteger(participants) || participants < 1 || participants > MAX_PARTICIPANTS) {
    throw new Error(`maxParticipants must be between 1 and ${MAX_PARTICIPANTS}`);
  }
  if (!Number.isSafeInteger(turns) || turns < 1 || turns > MAX_TURNS) {
    throw new Error(`maxTurns must be between 1 and ${MAX_TURNS}`);
  }
  return { maxParticipants: participants, maxTurns: turns };
}

async function sessionById(ctx: QueryCtx | MutationCtx, sessionId: string) {
  return ctx.db.query("simulationSessions").withIndex("by_session", (q) => q.eq("sessionId", sessionId)).unique();
}

async function assertSessionOwner(ctx: QueryCtx | MutationCtx, sessionId: string, ownerSubject: string) {
  const session = await sessionById(ctx, sessionId);
  if (!session || session.ownerSubject !== ownerSubject) throw new Error("simulation session not found");
  return session;
}

async function participantById(ctx: QueryCtx | MutationCtx, sessionId: string, participantId: string) {
  return ctx.db
    .query("simulationParticipants")
    .withIndex("by_session_and_participant", (q) => q.eq("sessionId", sessionId).eq("participantId", participantId))
    .unique();
}

function auditDetails(details: Record<string, unknown>): string {
  const encoded = JSON.stringify(details);
  if (encoded.length > MAX_OUTPUT_LENGTH) throw new Error("audit details exceed output bounds");
  return encoded;
}

async function appendAudit(
  ctx: MutationCtx,
  session: { sessionId: string; ownerSubject: string; ownerAddress?: string; traceId: string },
  eventKey: string,
  status: string,
  traceId: string,
  details: Record<string, unknown>,
  participantId?: string,
): Promise<void> {
  const eventId = `simulation:${session.sessionId}:${eventKey}`;
  const existing = await ctx.db.query("auditEvents").withIndex("by_event", (q) => q.eq("eventId", eventId)).unique();
  if (existing) return;
  await ctx.db.insert("auditEvents", {
    eventId,
    schemaVersion: "audit-event-v1",
    eventType: "simulation",
    status,
    timestampMs: Date.now(),
    traceId: traceId || session.traceId,
    ownerAddress: session.ownerAddress ?? session.ownerSubject,
    sessionId: session.sessionId,
    ...(participantId === undefined ? {} : { participantId }),
    detailsJson: auditDetails(details),
  });
}

function sessionResult(session: { sessionId: string; status: string; turnCount: number; participantCount: number }, idempotent = false) {
  return {
    sessionId: session.sessionId,
    status: session.status,
    turnCount: session.turnCount,
    participantCount: session.participantCount,
    idempotent,
  };
}

async function assertStartMatches(ctx: MutationCtx, existing: Doc<"simulationSessions">, args: StartInput): Promise<void> {
  const requestedObservations = observationIds(args.observationIds);
  if (
    existing.idempotencyKey !== args.idempotencyKey ||
    existing.scenarioJson !== args.scenarioJson ||
    existing.traceId !== args.traceId ||
    existing.ownerAddress !== args.ownerAddress ||
    existing.maxParticipants !== (args.maxParticipants ?? 16) ||
    existing.maxTurns !== (args.maxTurns ?? 24) ||
    existing.coordinatorProvider !== args.coordinatorProvider ||
    existing.coordinatorModel !== args.coordinatorModel ||
    JSON.stringify(existing.observationIds) !== JSON.stringify(requestedObservations)
  ) {
    throw new Error("idempotency key already exists with a conflicting payload");
  }
  const requested = args.participants ?? [];
  const persisted = await ctx.db.query("simulationParticipants").withIndex("by_session", (q) => q.eq("sessionId", existing.sessionId)).collect();
  if (persisted.length !== requested.length) throw new Error("idempotency key already exists with a conflicting payload");
  for (const participant of requested) {
    const saved = persisted.find((candidate) => candidate.participantId === participant.participantId);
    if (
      !saved ||
      saved.participantType !== participant.participantType ||
      saved.role !== participant.role ||
      saved.displayName !== participant.displayName ||
      saved.provider !== participant.provider ||
      saved.model !== participant.model ||
      saved.toolsJson !== participant.toolsJson ||
      saved.configJson !== participant.configJson ||
      saved.traceId !== (participant.traceId ?? args.traceId)
    ) {
      throw new Error("idempotency key already exists with a conflicting payload");
    }
  }
}

async function createSession(ctx: MutationCtx, args: StartInput, ownerSubject: string) {
  assertId(args.sessionId, "sessionId");
  assertText(ownerSubject, "ownerSubject", MAX_ID_LENGTH);
  if (args.ownerAddress !== undefined) assertText(args.ownerAddress, "ownerAddress", MAX_ID_LENGTH);
  parseJson(args.scenarioJson, "scenarioJson", MAX_JSON_LENGTH);
  assertText(args.traceId, "traceId", MAX_ID_LENGTH);
  assertId(args.idempotencyKey, "idempotencyKey");
  const { maxParticipants, maxTurns } = limits(args.maxParticipants, args.maxTurns);
  const observationIdList = observationIds(args.observationIds);
  modelMetadata(args.coordinatorProvider, args.coordinatorModel, false);
  const participants = args.participants ?? [];
  if (participants.length > maxParticipants) throw new Error("participant count exceeds maxParticipants");
  const seenParticipantIds = new Set<string>();
  for (const participant of participants) {
    assertId(participant.participantId, "participantId");
    if (seenParticipantIds.has(participant.participantId)) throw new Error("duplicate participantId");
    seenParticipantIds.add(participant.participantId);
    assertText(participant.role, "role", MAX_ROLE_LENGTH);
    modelMetadata(participant.provider, participant.model, participant.participantType === "ai_agent");
    if (participant.displayName !== undefined) assertText(participant.displayName, "displayName", MAX_ROLE_LENGTH);
    if (participant.toolsJson !== undefined) parseJson(participant.toolsJson, "toolsJson", MAX_JSON_LENGTH);
    if (participant.configJson !== undefined) parseJson(participant.configJson, "configJson", MAX_JSON_LENGTH);
    if (participant.traceId !== undefined) assertText(participant.traceId, "participant traceId", MAX_ID_LENGTH);
  }

  const existing = await sessionById(ctx, args.sessionId);
  if (existing) {
    if (existing.ownerSubject !== ownerSubject) throw new Error("simulation session not found");
    await assertStartMatches(ctx, existing, args);
    return sessionResult(existing, true);
  }
  const existingByKey = await ctx.db
    .query("simulationSessions")
    .withIndex("by_owner_and_idempotency", (q) => q.eq("ownerSubject", ownerSubject).eq("idempotencyKey", args.idempotencyKey))
    .unique();
  if (existingByKey) {
    await assertStartMatches(ctx, existingByKey, args);
    return sessionResult(existingByKey, true);
  }
  for (const participant of participants) {
    const existingParticipant = await ctx.db
      .query("simulationParticipants")
      .withIndex("by_participant", (q) => q.eq("participantId", participant.participantId))
      .unique();
    if (existingParticipant) throw new Error("participantId already exists");
  }

  const now = Date.now();
  const session = {
    sessionId: args.sessionId,
    ownerSubject,
    ...(args.ownerAddress === undefined ? {} : { ownerAddress: args.ownerAddress }),
    scenarioJson: args.scenarioJson,
    status: "created" as const,
    traceId: args.traceId,
    idempotencyKey: args.idempotencyKey,
    maxParticipants,
    maxTurns,
    participantCount: participants.length,
    turnCount: 0,
    ...(args.coordinatorProvider === undefined ? {} : { coordinatorProvider: args.coordinatorProvider }),
    ...(args.coordinatorModel === undefined ? {} : { coordinatorModel: args.coordinatorModel }),
    observationIds: observationIdList,
    createdAt: now,
    updatedAt: now,
  };
  await ctx.db.insert("simulationSessions", session);
  for (const participant of participants) {
    await ctx.db.insert("simulationParticipants", {
      participantId: participant.participantId,
      sessionId: args.sessionId,
      participantType: participant.participantType,
      role: participant.role,
      ...(participant.displayName === undefined ? {} : { displayName: participant.displayName }),
      ...(participant.provider === undefined ? {} : { provider: participant.provider }),
      ...(participant.model === undefined ? {} : { model: participant.model }),
      ...(participant.toolsJson === undefined ? {} : { toolsJson: participant.toolsJson }),
      ...(participant.configJson === undefined ? {} : { configJson: participant.configJson }),
      traceId: participant.traceId ?? args.traceId,
      createdAt: now,
      updatedAt: now,
    });
  }
  await appendAudit(ctx, session, "started", "accepted", args.traceId, {
    action: "start",
    participantCount: participants.length,
    maxParticipants,
    maxTurns,
    observationCount: observationIdList.length,
  });
  return sessionResult(session);
}

export const start = mutation({
  args: startFields,
  handler: async (ctx, args) => {
    const { identity } = await requireUser(ctx);
    return createSession(ctx, args as StartInput, identity.subject);
  },
});

export const startInternal = internalMutation({
  args: startFields,
  handler: async (ctx, args) => {
    const ownerSubject = args.ownerSubject;
    if (!ownerSubject) throw new Error("ownerSubject is required");
    return createSession(ctx, args as StartInput, ownerSubject);
  },
});

async function addParticipantImpl(ctx: MutationCtx, args: ParticipantInput & { sessionId: string }, ownerSubject: string) {
  const session = await assertSessionOwner(ctx, args.sessionId, ownerSubject);
  if (session.status === "cancelled" || session.status === "failed" || session.status === "completed") throw new Error("simulation session is not accepting participants");
  assertId(args.participantId, "participantId");
  assertText(args.role, "role", MAX_ROLE_LENGTH);
  modelMetadata(args.provider, args.model, args.participantType === "ai_agent");
  if (args.displayName !== undefined) assertText(args.displayName, "displayName", MAX_ROLE_LENGTH);
  if (args.toolsJson !== undefined) parseJson(args.toolsJson, "toolsJson", MAX_JSON_LENGTH);
  if (args.configJson !== undefined) parseJson(args.configJson, "configJson", MAX_JSON_LENGTH);
  const existing = await ctx.db.query("simulationParticipants").withIndex("by_participant", (q) => q.eq("participantId", args.participantId)).unique();
  if (existing) {
    if (
      existing.sessionId === args.sessionId &&
      existing.participantType === args.participantType &&
      existing.role === args.role &&
      existing.displayName === args.displayName &&
      existing.provider === args.provider &&
      existing.model === args.model &&
      existing.toolsJson === args.toolsJson &&
      existing.configJson === args.configJson &&
      existing.traceId === (args.traceId ?? session.traceId)
    ) {
      return { participantId: existing.participantId, idempotent: true };
    }
    throw new Error("participantId already exists with a conflicting payload");
  }
  const count = await ctx.db.query("simulationParticipants").withIndex("by_session", (q) => q.eq("sessionId", args.sessionId)).collect();
  if (count.length >= session.maxParticipants) throw new Error("participant count exceeds maxParticipants");
  const now = Date.now();
  await ctx.db.insert("simulationParticipants", {
    participantId: args.participantId,
    sessionId: args.sessionId,
    participantType: args.participantType,
    role: args.role,
    ...(args.displayName === undefined ? {} : { displayName: args.displayName }),
    ...(args.provider === undefined ? {} : { provider: args.provider }),
    ...(args.model === undefined ? {} : { model: args.model }),
    ...(args.toolsJson === undefined ? {} : { toolsJson: args.toolsJson }),
    ...(args.configJson === undefined ? {} : { configJson: args.configJson }),
    traceId: args.traceId ?? session.traceId,
    createdAt: now,
    updatedAt: now,
  });
  await ctx.db.patch(session._id, { participantCount: count.length + 1, updatedAt: now, status: session.status === "created" ? "running" : session.status });
  await appendAudit(ctx, session, `participant:${args.participantId}`, "accepted", args.traceId ?? session.traceId, {
    action: "participant_added",
    participantType: args.participantType,
    role: args.role,
  }, args.participantId);
  return { participantId: args.participantId, idempotent: false };
}

export const addParticipant = mutation({
  args: { ...participantInput.fields, sessionId: v.string(), ownerSubject: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { identity } = await requireUser(ctx);
    return addParticipantImpl(ctx, args as ParticipantInput & { sessionId: string }, identity.subject);
  },
});

export const addParticipantInternal = internalMutation({
  args: { ...participantInput.fields, sessionId: v.string(), ownerSubject: v.string() },
  handler: async (ctx, args) => addParticipantImpl(ctx, args as ParticipantInput & { sessionId: string }, args.ownerSubject),
});

async function submitTurnImpl(ctx: MutationCtx, args: TurnInput, ownerSubject: string) {
  const session = await assertSessionOwner(ctx, args.sessionId, ownerSubject);
  assertId(args.eventId, "eventId");
  assertId(args.idempotencyKey, "idempotencyKey");
  if (!Number.isSafeInteger(args.turn) || args.turn < 1) throw new Error("turn must be a positive integer");
  const eventType = args.eventType ?? "turn";
  assertText(eventType, "eventType", MAX_EVENT_TYPE_LENGTH);
  if (args.traceId !== undefined) assertText(args.traceId, "traceId", MAX_ID_LENGTH);
  const ids = observationIds(args.observationIds);
  if (args.inputJson !== undefined) parseJson(args.inputJson, "inputJson", MAX_JSON_LENGTH);
  if (args.outputJson !== undefined) parseJson(args.outputJson, "outputJson", MAX_OUTPUT_LENGTH);
  if (args.resultJson !== undefined) parseJson(args.resultJson, "resultJson", MAX_OUTPUT_LENGTH);

  const existingByKey = await ctx.db
    .query("simulationEvents")
    .withIndex("by_session_and_idempotency", (q) => q.eq("sessionId", args.sessionId).eq("idempotencyKey", args.idempotencyKey))
    .unique();
  if (existingByKey) {
    if (
      existingByKey.eventId !== args.eventId ||
      existingByKey.turn !== args.turn ||
      existingByKey.participantId !== args.participantId ||
      existingByKey.eventType !== eventType ||
      existingByKey.traceId !== (args.traceId ?? session.traceId) ||
      existingByKey.inputJson !== args.inputJson ||
      existingByKey.outputJson !== args.outputJson ||
      existingByKey.resultJson !== args.resultJson &&
        existingByKey.resultJson !== args.outputJson ||
      JSON.stringify(existingByKey.observationIds) !== JSON.stringify(ids)
    ) {
      throw new Error("idempotency key already exists with a conflicting payload");
    }
    return { ...sessionResult(session, true), eventId: existingByKey.eventId, turn: existingByKey.turn };
  }
  const existingById = await ctx.db.query("simulationEvents").withIndex("by_event", (q) => q.eq("eventId", args.eventId)).unique();
  if (existingById) {
    if (
      existingById.sessionId !== args.sessionId ||
      existingById.idempotencyKey !== args.idempotencyKey ||
      existingById.turn !== args.turn ||
      existingById.participantId !== args.participantId ||
      existingById.eventType !== eventType ||
      existingById.traceId !== (args.traceId ?? session.traceId) ||
      existingById.inputJson !== args.inputJson ||
      existingById.outputJson !== args.outputJson ||
      existingById.resultJson !== args.resultJson &&
        existingById.resultJson !== args.outputJson ||
      JSON.stringify(existingById.observationIds) !== JSON.stringify(ids)
    ) {
      throw new Error("eventId already exists with a conflicting payload");
    }
    return { ...sessionResult(session, true), eventId: existingById.eventId, turn: existingById.turn };
  }
  if (session.status === "cancelled" || session.status === "failed" || session.status === "completed") throw new Error("simulation session is not accepting turns");
  if (args.turn !== session.turnCount + 1) throw new Error("turn must advance the session by exactly one");
  if (args.turn > session.maxTurns) throw new Error("turn count exceeds maxTurns");
  const participant = await participantById(ctx, args.sessionId, args.participantId);
  if (!participant) throw new Error("participant not found");

  const now = Date.now();
  const traceId = args.traceId ?? session.traceId;
  const status = args.turn >= session.maxTurns ? "completed" : "running";
  await ctx.db.insert("simulationEvents", {
    eventId: args.eventId,
    sessionId: args.sessionId,
    turn: args.turn,
    eventType,
    participantId: args.participantId,
    traceId,
    idempotencyKey: args.idempotencyKey,
    ...(args.inputJson === undefined ? {} : { inputJson: args.inputJson }),
    ...(args.outputJson === undefined ? {} : { outputJson: args.outputJson }),
    ...(args.resultJson === undefined ? {} : { resultJson: args.resultJson }),
    observationIds: ids,
    createdAt: now,
  });
  await ctx.db.patch(session._id, {
    status,
    ...(args.resultJson === undefined && args.outputJson === undefined ? {} : { resultJson: args.resultJson ?? args.outputJson }),
    updatedAt: now,
  });
  await appendAudit(ctx, session, `turn:${args.turn}`, "accepted", traceId, {
    action: "turn_submitted",
    eventId: args.eventId,
    participantId: args.participantId,
    turn: args.turn,
    observationCount: ids.length,
  }, args.participantId);
  return { sessionId: args.sessionId, eventId: args.eventId, turn: args.turn, status, turnCount: args.turn, participantCount: session.participantCount, idempotent: false };
}

export const submitTurn = mutation({
  args: turnFields,
  handler: async (ctx, args) => {
    const { identity } = await requireUser(ctx);
    return submitTurnImpl(ctx, args as TurnInput, identity.subject);
  },
});

export const submitTurnInternal = internalMutation({
  args: turnFields,
  handler: async (ctx, args) => {
    const ownerSubject = args.ownerSubject;
    if (!ownerSubject) throw new Error("ownerSubject is required");
    return submitTurnImpl(ctx, args as TurnInput, ownerSubject);
  },
});

async function recordProposalImpl(ctx: MutationCtx, args: ProposalInput, ownerSubject: string) {
  const session = await assertSessionOwner(ctx, args.sessionId, ownerSubject);
  assertId(args.proposalId, "proposalId");
  assertId(args.idempotencyKey, "idempotencyKey");
  if (args.solverId !== undefined) assertId(args.solverId, "solverId");
  assertText(args.proposalType, "proposalType", MAX_EVENT_TYPE_LENGTH);
  modelMetadata(args.provider, args.model, true);
  parseJson(args.proposalJson, "proposalJson", MAX_OUTPUT_LENGTH);
  if (args.rationaleJson !== undefined) parseJson(args.rationaleJson, "rationaleJson", MAX_RATIONALE_LENGTH);
  if (args.traceId !== undefined) assertText(args.traceId, "traceId", MAX_ID_LENGTH);
  const ids = observationIds(args.observationIds);
  if (args.participantId !== undefined && !(await participantById(ctx, args.sessionId, args.participantId))) throw new Error("participant not found");
  if (session.status === "cancelled" || session.status === "failed") throw new Error("simulation session is not accepting proposals");

  const existingByKey = await ctx.db
    .query("solverProposals")
    .withIndex("by_session_and_idempotency", (q) => q.eq("sessionId", args.sessionId).eq("idempotencyKey", args.idempotencyKey))
    .unique();
  if (existingByKey) {
    if (
      existingByKey.solverId !== args.solverId ||
      existingByKey.proposalId !== args.proposalId ||
      existingByKey.participantId !== args.participantId ||
      existingByKey.proposalType !== args.proposalType ||
      existingByKey.provider !== args.provider ||
      existingByKey.model !== args.model ||
      existingByKey.proposalJson !== args.proposalJson ||
      existingByKey.rationaleJson !== args.rationaleJson ||
      existingByKey.status !== (args.status ?? "pending") ||
      existingByKey.traceId !== (args.traceId ?? session.traceId) ||
      JSON.stringify(existingByKey.observationIds) !== JSON.stringify(ids)
    ) {
      throw new Error("idempotency key already exists with a conflicting payload");
    }
    return { proposalId: existingByKey.proposalId, sessionId: args.sessionId, status: existingByKey.status, idempotent: true };
  }
  const existingById = await ctx.db.query("solverProposals").withIndex("by_proposal", (q) => q.eq("proposalId", args.proposalId)).unique();
  if (existingById) {
    if (
      existingById.solverId !== args.solverId ||
      existingById.sessionId !== args.sessionId ||
      existingById.idempotencyKey !== args.idempotencyKey ||
      existingById.participantId !== args.participantId ||
      existingById.proposalType !== args.proposalType ||
      existingById.provider !== args.provider ||
      existingById.model !== args.model ||
      existingById.proposalJson !== args.proposalJson ||
      existingById.rationaleJson !== args.rationaleJson ||
      existingById.status !== (args.status ?? "pending") ||
      existingById.traceId !== (args.traceId ?? session.traceId) ||
      JSON.stringify(existingById.observationIds) !== JSON.stringify(ids)
    ) {
      throw new Error("proposalId already exists with a conflicting payload");
    }
    return { proposalId: existingById.proposalId, sessionId: args.sessionId, status: existingById.status, idempotent: true };
  }
  const proposalCount = await ctx.db.query("solverProposals").withIndex("by_session", (q) => q.eq("sessionId", args.sessionId)).collect();
  if (proposalCount.length >= MAX_PROPOSALS_PER_SESSION) throw new Error("proposal count exceeds session bound");
  const traceId = args.traceId ?? session.traceId;
  await ctx.db.insert("solverProposals", {
    proposalId: args.proposalId,
    sessionId: args.sessionId,
    ...(args.participantId === undefined ? {} : { participantId: args.participantId }),
    proposalType: args.proposalType,
    provider: args.provider,
    model: args.model,
    proposalJson: args.proposalJson,
    ...(args.rationaleJson === undefined ? {} : { rationaleJson: args.rationaleJson }),
    status: args.status ?? "pending",
    traceId,
    idempotencyKey: args.idempotencyKey,
    ...(args.solverId === undefined ? {} : { solverId: args.solverId }),
    observationIds: ids,
    createdAt: Date.now(),
  });
  await appendAudit(ctx, session, `proposal:${args.proposalId}`, "accepted", traceId, {
    action: "solver_proposal_recorded",
    proposalId: args.proposalId,
    proposalType: args.proposalType,
    provider: args.provider,
    model: args.model,
    observationCount: ids.length,
  }, args.participantId);
  return { proposalId: args.proposalId, sessionId: args.sessionId, status: args.status ?? "pending", idempotent: false };
}

export const recordProposal = mutation({
  args: proposalFields,
  handler: async (ctx, args) => {
    const { identity } = await requireUser(ctx);
    return recordProposalImpl(ctx, args as ProposalInput, identity.subject);
  },
});

export const recordProposalInternal = internalMutation({
  args: proposalFields,
  handler: async (ctx, args) => {
    const ownerSubject = args.ownerSubject;
    if (!ownerSubject) throw new Error("ownerSubject is required");
    return recordProposalImpl(ctx, args as ProposalInput, ownerSubject);
  },
});

async function statusFor(ctx: QueryCtx, sessionId: string, ownerSubject: string, limit = 200) {
  assertId(sessionId, "sessionId");
  assertText(ownerSubject, "ownerSubject", MAX_ID_LENGTH);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 200) throw new Error("limit must be between 1 and 200");
  const session = await assertSessionOwner(ctx, sessionId, ownerSubject);
  const [participants, events, proposals] = await Promise.all([
    ctx.db.query("simulationParticipants").withIndex("by_session", (q) => q.eq("sessionId", sessionId)).collect(),
    ctx.db.query("simulationEvents").withIndex("by_session_and_turn", (q) => q.eq("sessionId", sessionId)).order("asc").collect(),
    ctx.db.query("solverProposals").withIndex("by_session", (q) => q.eq("sessionId", sessionId)).collect(),
  ]);
  return {
    session,
    participants: participants.slice(0, limit),
    events: events.slice(0, limit),
    proposals: proposals.slice(0, limit),
  };
}

export const getStatus = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const { identity } = await requireUser(ctx);
    const session = await sessionById(ctx, args.sessionId);
    if (!session || session.ownerSubject !== identity.subject) return null;
    return statusFor(ctx, args.sessionId, identity.subject);
  },
});

export const getStatusInternal = internalQuery({
  args: { sessionId: v.string(), ownerSubject: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => statusFor(ctx, args.sessionId, args.ownerSubject, args.limit),
});
