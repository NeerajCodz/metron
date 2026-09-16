import { RECOVERY_SCHEMA_VERSION, RISK_SCHEMA_VERSION, type MarketRegime } from "@metron/types";
import { z } from "zod";

import {
  addressSchema,
  basisPointsSchema,
  decimalStringSchema,
  nonEmptyIdSchema,
  signedIntegerStringSchema,
  unixMillisecondsSchema,
  unixSecondsSchema,
  unsignedIntegerStringSchema,
} from "./primitives.js";

const traceFields = {
  traceId: nonEmptyIdSchema,
  intentId: nonEmptyIdSchema.optional(),
  positionId: nonEmptyIdSchema.optional(),
  chainId: z.number().int().positive().optional(),
};

const modelFields = {
  modelVersion: nonEmptyIdSchema,
  featureSchemaVersion: nonEmptyIdSchema,
  datasetFingerprint: z
    .string()
    .regex(/^[0-9a-f]{64}$/)
    .optional(),
  featureFingerprint: z
    .string()
    .regex(/^[0-9a-f]{64}$/)
    .optional(),
  artifactVersion: nonEmptyIdSchema.optional(),
  predictionSource: z.enum(["model", "deterministic", "mixed"]).optional(),
  sourceByHorizon: z
    .record(z.enum(["1h", "6h", "24h", "7d"]), z.enum(["model", "deterministic"]))
    .optional(),
  fallbackReason: nonEmptyIdSchema.optional(),
  generatedAt: unixSecondsSchema,
};
export const marketRegimes = [
  "stable",
  "trending",
  "high_volatility",
  "liquidity_stress",
  "flash_crash",
  "recovery",
] as const satisfies readonly MarketRegime[];

export const liquidationHorizonSchema = z.enum(["1h", "6h", "24h", "7d"]);

export const liquidationPredictionSchema = z.strictObject({
  schemaVersion: z.literal(RISK_SCHEMA_VERSION),
  ...traceFields,
  ...modelFields,
  predictionId: nonEmptyIdSchema,
  positionId: nonEmptyIdSchema,
  horizons: z.partialRecord(liquidationHorizonSchema, basisPointsSchema),
  confidenceBps: basisPointsSchema,
  fallbackUsed: z.boolean(),
});

export const regimePredictionSchema = z.strictObject({
  schemaVersion: z.literal(RISK_SCHEMA_VERSION),
  ...traceFields,
  ...modelFields,
  probabilitiesBps: z.object(
    Object.fromEntries(marketRegimes.map((regime) => [regime, basisPointsSchema])) as Record<
      MarketRegime,
      typeof basisPointsSchema
    >,
  ),
  selectedRegime: z.enum(marketRegimes),
  fallbackUsed: z.boolean(),
});

export const stressScenarioSchema = z.strictObject({
  schemaVersion: z.literal(RISK_SCHEMA_VERSION),
  scenarioId: nonEmptyIdSchema.optional(),
  ethPriceShockBps: z.number().int().min(-10_000).max(100_000),
  stablecoinDepegBps: z.number().int().min(-10_000).max(10_000),
  dexLiquidityShockBps: z.number().int().min(-10_000).max(100_000),
  volatilityMultiplierBps: z.number().int().min(0).max(1_000_000),
  gasMultiplierBps: z.number().int().min(0).max(1_000_000),
  lendingUtilizationShockBps: z.number().int().min(-10_000).max(10_000),
});

const recoveryActionTypeSchema = z.enum([
  "repay_debt",
  "sell_collateral",
  "swap_collateral",
  "adjust_hedge",
  "withdraw_liquidity",
  "recenter_liquidity",
  "reserve_repayment",
  "combined",
  "move_to_safe_state",
]);

export const recoveryActionSchema = z.strictObject({
  actionId: nonEmptyIdSchema,
  type: recoveryActionTypeSchema,
  chainId: z.number().int().positive(),
  asset: addressSchema.optional(),
  amount: unsignedIntegerStringSchema.optional(),
  collateralSaleBps: basisPointsSchema.optional(),
  maxSlippageBps: basisPointsSchema,
  expectedCostUsd: decimalStringSchema,
  expectedLossUsd: decimalStringSchema,
  resultingHealthFactorWad: unsignedIntegerStringSchema,
  resultingDeltaWad: signedIntegerStringSchema,
  postActionLiquidationProbabilityBps: basisPointsSchema,
  protocol: nonEmptyIdSchema,
});

export const recoveryRankingSchema = z.strictObject({
  schemaVersion: z.literal(RECOVERY_SCHEMA_VERSION),
  ...traceFields,
  ...modelFields,
  positionId: nonEmptyIdSchema,
  candidates: z.array(recoveryActionSchema),
  rejected: z.array(
    z.strictObject({
      actionId: nonEmptyIdSchema,
      reasons: z.array(z.string().trim().min(1)).min(1),
    }),
  ),
  fallbackUsed: z.boolean(),
});
export const explanationEvidenceSchema = z.strictObject({
  evidenceId: nonEmptyIdSchema,
  kind: z.enum(["observation", "calculation", "prediction", "scenario"]),
  sourceReference: nonEmptyIdSchema,
  traceId: nonEmptyIdSchema,
  observedAtMs: unixMillisecondsSchema.optional(),
  quality: z.enum(["valid", "stale", "invalid"]).default("valid"),
  content: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
});

export const explanationAnswerKindSchema = z.enum([
  "value",
  "trend",
  "driver",
  "comparison",
  "scenario_impact",
]);

export const thresholdRequestSchema = z.strictObject({
  traceId: nonEmptyIdSchema,
  currentLiquidationProbabilityBps: basisPointsSchema,
  userMaxProbabilityBps: basisPointsSchema,
  administratorMaxProbabilityBps: basisPointsSchema,
  hysteresisBps: basisPointsSchema,
  marketRegime: z.enum(marketRegimes).optional(),
  liquidityStressBps: basisPointsSchema,
  protocolRiskBps: basisPointsSchema,
  healthFactorWad: unsignedIntegerStringSchema.optional(),
  observationQuality: z.enum(["valid", "stale", "invalid", "missing"]),
  observationIds: z.array(nonEmptyIdSchema),
  policyId: nonEmptyIdSchema,
  policyVersion: nonEmptyIdSchema,
  evaluationTimeMs: unixMillisecondsSchema,
  priorInterventionBps: basisPointsSchema,
});

export const thresholdResponseSchema = z.strictObject({
  traceId: nonEmptyIdSchema,
  recommendedInterventionBps: basisPointsSchema,
  interventionRequired: z.boolean(),
  rationale: z.array(z.string().trim().min(1)).min(1),
  policyId: nonEmptyIdSchema,
  policyVersion: nonEmptyIdSchema,
  evaluationTimeMs: unixMillisecondsSchema,
  adjustmentTerms: z.record(z.string(), z.number().int()),
  selectedCapBps: basisPointsSchema,
  validityWindowMs: unixMillisecondsSchema,
  fallbackReason: nonEmptyIdSchema.optional(),
});
