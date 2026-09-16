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

const strategyStageSchema = z.enum([
  "discovery",
  "quote",
  "approval",
  "execution",
  "settlement",
  "recovery",
]);
const strategyGraphNodeSchema = z.strictObject({
  nodeId: nonEmptyIdSchema,
  stage: strategyStageSchema,
  action: routeActionSchema,
  dependsOn: z.array(nonEmptyIdSchema),
});

const strategyGraphSchema = z.strictObject({
  graphId: nonEmptyIdSchema,
  nodes: z.array(strategyGraphNodeSchema).min(1),
  entryNodeIds: z.array(nonEmptyIdSchema).min(1),
  terminalNodeIds: z.array(nonEmptyIdSchema).min(1),
});

export const solverRouteSchema = z
  .strictObject({
    schemaVersion: z.literal(SOLVER_ROUTE_SCHEMA_VERSION),
    routeId: nonEmptyIdSchema,
    solverId: nonEmptyIdSchema,
    intentId: nonEmptyIdSchema,
    strategyId: nonEmptyIdSchema,
    actions: z.array(routeActionSchema).min(1),
    strategyGraph: strategyGraphSchema.optional(),
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
    if (!route.strategyGraph) return;
    const nodeIds = new Set(route.strategyGraph.nodes.map((node) => node.nodeId));
    const actionIndexes = new Set(route.actions.map((action) => action.actionIndex));
    for (const node of route.strategyGraph.nodes) {
      if (!actionIndexes.has(node.action.actionIndex)) {
        context.addIssue({
          code: "custom",
          message: "strategy graph node action is not present in route",
          path: ["strategyGraph", "nodes"],
        });
      }
      for (const dependency of node.dependsOn) {
        if (!nodeIds.has(dependency) || dependency === node.nodeId) {
          context.addIssue({
            code: "custom",
            message: "strategy graph dependency is invalid",
            path: ["strategyGraph", "nodes"],
          });
        }
      }
    }
    for (const nodeId of [
      ...route.strategyGraph.entryNodeIds,
      ...route.strategyGraph.terminalNodeIds,
    ]) {
      if (!nodeIds.has(nodeId)) {
        context.addIssue({
          code: "custom",
          message: "strategy graph boundary node is missing",
          path: ["strategyGraph"],
        });
      }
    }
  });
