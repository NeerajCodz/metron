import { INTENT_SCHEMA_VERSION } from "@metron/types";
import { z } from "zod";

import {
  addressSchema,
  basisPointsSchema,
  chainIdSchema,
  hasUniqueValues,
  signedIntegerStringSchema,
  unixSecondsSchema,
  unsignedIntegerStringSchema,
} from "./primitives.js";

export const intentObjectiveSchema = z
  .strictObject({
    targetApyMinBps: basisPointsSchema.optional(),
    targetApyMaxBps: basisPointsSchema.optional(),
  })
  .refine(
    ({ targetApyMinBps, targetApyMaxBps }) =>
      targetApyMinBps === undefined ||
      targetApyMaxBps === undefined ||
      targetApyMinBps <= targetApyMaxBps,
    { message: "targetApyMinBps must not exceed targetApyMaxBps" },
  );

export const intentRiskLimitsSchema = z.strictObject({
  maxDrawdownBps: basisPointsSchema,
  maxImpermanentLossBps: basisPointsSchema.optional(),
  maxLiquidationProbabilityBps: basisPointsSchema.optional(),
  minHealthFactorWad: unsignedIntegerStringSchema.optional(),
  maxSlippageBps: basisPointsSchema,
  maxCapitalMoveBps: basisPointsSchema,
  maxCollateralSaleBps: basisPointsSchema,
  maxRepaymentAmount: unsignedIntegerStringSchema.optional(),
  maxGasFeeUsd: unsignedIntegerStringSchema.optional(),
});

export const intentExposureSchema = z.strictObject({
  targetDeltaWad: signedIntegerStringSchema,
  deltaToleranceWad: unsignedIntegerStringSchema,
});

export const intentAutomationPolicySchema = z.strictObject({
  rebalance: z.boolean(),
  recovery: z.boolean(),
  emergencyUnwind: z.boolean(),
});

export const intentPrivacyPolicySchema = z.strictObject({
  privateParameters: z.boolean(),
  zkOwnershipRequired: z.boolean(),
  zkCollateralRequired: z.boolean(),
});

export const canonicalIntentSchema = z
  .strictObject({
    schemaVersion: z.literal(INTENT_SCHEMA_VERSION),
    owner: addressSchema,
    nonce: unsignedIntegerStringSchema,
    expiresAt: unixSecondsSchema,
    objective: intentObjectiveSchema,
    risk: intentRiskLimitsSchema,
    exposure: intentExposureSchema,
    chains: z.array(chainIdSchema).min(1),
    protocols: z.array(z.string().trim().min(1).max(64)).min(1),
    assets: z.array(addressSchema).min(1),
    automation: intentAutomationPolicySchema,
    privacy: intentPrivacyPolicySchema,
  })
  .superRefine((intent, context) => {
    if (!hasUniqueValues(intent.chains)) {
      context.addIssue({ code: "custom", message: "chains must be unique", path: ["chains"] });
    }
    if (!hasUniqueValues(intent.protocols)) {
      context.addIssue({
        code: "custom",
        message: "protocols must be unique",
        path: ["protocols"],
      });
    }
    const normalizedAssets = intent.assets.map((asset) => asset.toLowerCase());
    if (!hasUniqueValues(normalizedAssets)) {
      context.addIssue({ code: "custom", message: "assets must be unique", path: ["assets"] });
    }
  });
