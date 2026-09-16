import { PORTFOLIO_GRAPH_SCHEMA_VERSION } from "@metron/types";
import { z } from "zod";

import {
  addressSchema,
  chainIdSchema,
  decimalStringSchema,
  nonEmptyIdSchema,
  signedIntegerStringSchema,
  unixMillisecondsSchema,
  unsignedIntegerStringSchema,
} from "./primitives.js";

const metadataSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]));

export const portfolioNodeSchema = z.strictObject({
  nodeId: nonEmptyIdSchema,
  componentType: z.enum(["vault", "lending", "liquidity", "hedge", "cross_chain", "insurance"]),
  chainId: chainIdSchema,
  protocol: nonEmptyIdSchema,
  contract: addressSchema,
  assets: z.array(addressSchema),
  valueUsd: decimalStringSchema,
  deltaWad: signedIntegerStringSchema,
  healthFactorWad: unsignedIntegerStringSchema.optional(),
  sourceBlockNumber: z.number().int().nonnegative(),
  sourceObservedAtMs: unixMillisecondsSchema,
  metadata: metadataSchema,
});

export const portfolioEdgeSchema = z.strictObject({
  edgeId: nonEmptyIdSchema,
  fromNodeId: nonEmptyIdSchema,
  toNodeId: nonEmptyIdSchema,
  kind: z.enum(["dependency", "bridge", "hedge", "recovery"]),
});

export const portfolioGraphSchema = z
  .strictObject({
    positionId: nonEmptyIdSchema,
    schemaVersion: z.literal(PORTFOLIO_GRAPH_SCHEMA_VERSION),
    nodes: z.array(portfolioNodeSchema),
    edges: z.array(portfolioEdgeSchema),
    netValueUsd: decimalStringSchema,
    netDeltaWad: signedIntegerStringSchema,
    healthFactorWad: unsignedIntegerStringSchema.optional(),
    latestBlockByChain: z.record(z.string().regex(/^\d+$/), z.number().int().nonnegative()),
    provenance: z.strictObject({
      traceIds: z.array(nonEmptyIdSchema),
      observedAtMs: unixMillisecondsSchema,
      source: nonEmptyIdSchema,
    }),
  })
  .superRefine((graph, context) => {
    const nodeIds = new Set(graph.nodes.map((node) => node.nodeId));
    const edgeIds = new Set(graph.edges.map((edge) => edge.edgeId));
    if (nodeIds.size !== graph.nodes.length) {
      context.addIssue({ code: "custom", path: ["nodes"], message: "node IDs must be unique" });
    }
    if (edgeIds.size !== graph.edges.length) {
      context.addIssue({ code: "custom", path: ["edges"], message: "edge IDs must be unique" });
    }
    graph.edges.forEach((edge, index) => {
      if (!nodeIds.has(edge.fromNodeId) || !nodeIds.has(edge.toNodeId)) {
        context.addIssue({ code: "custom", path: ["edges", index], message: "edge references a missing node" });
      }
      if (edge.fromNodeId === edge.toNodeId) {
        context.addIssue({ code: "custom", path: ["edges", index], message: "self-referential edges are invalid" });
      }
    });
  });
