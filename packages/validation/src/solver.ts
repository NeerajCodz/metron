import { SOLVER_ROUTE_SCHEMA_VERSION } from "@metron/types";
import { z } from "zod";

import {
  addressSchema,
  basisPointsSchema,
  decimalStringSchema,
  hexSchema,
  nonEmptyIdSchema,
  signedIntegerStringSchema,
  unixSecondsSchema,
  unsignedIntegerStringSchema,
} from "./primitives.js";

export const routeActionTypeSchema = z.enum([
  "deposit",
  "supply",
  "borrow",
  "repay",
  "withdraw",
  "swap",
  "add_liquidity",
  "remove_liquidity",
  "open_hedge",
  "adjust_hedge",
  "cross_chain_message",
  "safe_state",
]);

export const routeActionSchema = z.strictObject({
  actionIndex: z.number().int().nonnegative(),
  chainId: z.number().int().positive(),
  protocol: nonEmptyIdSchema,
  actionType: routeActionTypeSchema,
  target: addressSchema,
  assetIn: addressSchema.optional(),
  assetOut: addressSchema.optional(),
  amount: unsignedIntegerStringSchema,
  minimumOutput: unsignedIntegerStringSchema.optional(),
  calldata: hexSchema,
});

export const solverRouteSchema = z
  .strictObject({
    schemaVersion: z.literal(SOLVER_ROUTE_SCHEMA_VERSION),
    routeId: nonEmptyIdSchema,
    solverId: nonEmptyIdSchema,
    intentId: nonEmptyIdSchema,
    strategyId: nonEmptyIdSchema,
    actions: z.array(routeActionSchema).min(1),
    expectedNetApyBps: basisPointsSchema,
    expectedDrawdownBps: basisPointsSchema,
    expectedImpermanentLossBps: basisPointsSchema.optional(),
    liquidationProbabilityBps: basisPointsSchema,
    estimatedGasUsd: decimalStringSchema,
    estimatedSlippageBps: basisPointsSchema,
    bridgeCostUsd: decimalStringSchema,
    resultingDeltaWad: signedIntegerStringSchema,
    resultingHealthFactorWad: unsignedIntegerStringSchema.optional(),
    liquidityScoreBps: basisPointsSchema,
    validityDeadline: unixSecondsSchema,
    scoreVersion: nonEmptyIdSchema,
  })
  .superRefine((route, context) => {
    route.actions.forEach((action, index) => {
      if (action.actionIndex !== index) {
        context.addIssue({
          code: "custom",
          message: "actionIndex must match action order",
          path: ["actions", index, "actionIndex"],
        });
      }
    });
  });
