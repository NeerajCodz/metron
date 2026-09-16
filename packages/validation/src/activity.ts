import { AUDIT_EVENT_SCHEMA_VERSION } from "@metron/types";
import { z } from "zod";

import {
  addressSchema,
  chainIdSchema,
  hexSchema,
  nonEmptyIdSchema,
  unixMillisecondsSchema,
} from "./primitives.js";

const detailsSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]));
const base = {
  eventId: nonEmptyIdSchema,
  schemaVersion: z.literal(AUDIT_EVENT_SCHEMA_VERSION),
  timestampMs: unixMillisecondsSchema,
  traceId: nonEmptyIdSchema,
  ownerAddress: addressSchema,
  intentId: nonEmptyIdSchema.optional(),
  positionId: nonEmptyIdSchema.optional(),
  chainId: chainIdSchema.optional(),
  transactionHash: hexSchema.optional(),
  details: detailsSchema,
};

export const intentAuditEventSchema = z.strictObject({
  ...base,
  eventType: z.literal("intent"),
  intentId: nonEmptyIdSchema,
  status: z.enum(["draft", "published", "authorized", "auctioning", "settled", "cancelled", "expired"]),
});
export const solverAuditEventSchema = z.strictObject({
  ...base,
  eventType: z.literal("solver"),
  intentId: nonEmptyIdSchema,
  solverId: nonEmptyIdSchema,
  status: z.enum(["committed", "revealed", "selected", "rejected"]),
});
export const executionAuditEventSchema = z.strictObject({
  ...base,
  eventType: z.literal("execution"),
  executionId: nonEmptyIdSchema,
  intentId: nonEmptyIdSchema,
  status: z.enum(["pending", "submitted", "confirmed", "failed", "expired"]),
});
export const componentAuditEventSchema = z.strictObject({
  ...base,
  eventType: z.literal("component"),
  positionId: nonEmptyIdSchema,
  componentId: nonEmptyIdSchema,
  status: z.enum(["observed", "updated", "replaced"]),
});
export const riskSnapshotAuditEventSchema = z.strictObject({
  ...base,
  eventType: z.literal("risk_snapshot"),
  positionId: nonEmptyIdSchema,
  snapshotId: nonEmptyIdSchema,
  status: z.literal("observed"),
});
export const predictionRecommendationAuditEventSchema = z.strictObject({
  ...base,
  eventType: z.enum(["prediction", "recommendation"]),
  positionId: nonEmptyIdSchema.optional(),
  predictionId: nonEmptyIdSchema.optional(),
  recommendationId: nonEmptyIdSchema.optional(),
  status: z.enum(["generated", "rejected"]),
});
export const alertEmergencyAuditEventSchema = z.strictObject({
  ...base,
  eventType: z.enum(["alert", "emergency"]),
  positionId: nonEmptyIdSchema.optional(),
  alertId: nonEmptyIdSchema.optional(),
  status: z.enum(["opened", "acknowledged", "resolved", "triggered"]),
});
export const crossChainAuditEventSchema = z.strictObject({
  ...base,
  eventType: z.literal("cross_chain"),
  positionId: nonEmptyIdSchema.optional(),
  messageId: nonEmptyIdSchema,
  status: z.enum([
    "created",
    "source_locked",
    "message_sent",
    "destination_received",
    "destination_executed",
    "ack_sent",
    "confirmed",
    "expired",
    "failed",
    "recovery_required",
  ]),
});

export const auditEventSchema = z.discriminatedUnion("eventType", [
  intentAuditEventSchema,
  solverAuditEventSchema,
  executionAuditEventSchema,
  componentAuditEventSchema,
  riskSnapshotAuditEventSchema,
  predictionRecommendationAuditEventSchema,
  alertEmergencyAuditEventSchema,
  crossChainAuditEventSchema,
]);
