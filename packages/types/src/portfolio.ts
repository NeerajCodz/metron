import type {
  Address,
  ChainId,
  DecimalString,
  PositionComponentId,
  PositionId,
  UsdAmount,
  VersionedPayload,
} from "./primitives.js";

export const PORTFOLIO_GRAPH_SCHEMA_VERSION = "portfolio-graph-v1" as const;

export type PortfolioNodeComponentType =
  | "vault"
  | "lending"
  | "liquidity"
  | "hedge"
  | "cross_chain"
  | "insurance";
export type PortfolioEdgeKind = "dependency" | "bridge" | "hedge" | "recovery";

export interface PortfolioNode {
  nodeId: PositionComponentId;
  componentType: PortfolioNodeComponentType;
  chainId: ChainId;
  protocol: string;
  contract: Address;
  assets: Address[];
  valueUsd: UsdAmount;
  deltaWad: string;
  healthFactorWad?: string;
  sourceBlockNumber: number;
  sourceObservedAtMs: number;
  metadata: Record<string, string | number | boolean | null>;
}

export interface PortfolioEdge {
  edgeId: string;
  fromNodeId: PositionComponentId;
  toNodeId: PositionComponentId;
  kind: PortfolioEdgeKind;
}

export interface PortfolioGraph extends VersionedPayload {
  positionId: PositionId;
  schemaVersion: typeof PORTFOLIO_GRAPH_SCHEMA_VERSION;
  nodes: PortfolioNode[];
  edges: PortfolioEdge[];
  netValueUsd: UsdAmount;
  netDeltaWad: string;
  healthFactorWad?: string;
  latestBlockByChain: Record<string, number>;
  provenance: {
    traceIds: string[];
    observedAtMs: number;
    source: string;
  };
}

export function validatePortfolioGraph(graph: PortfolioGraph): void {
  const nodeIds = new Set(graph.nodes.map((node) => node.nodeId));
  if (nodeIds.size !== graph.nodes.length) throw new Error("portfolio graph contains duplicate node IDs");
  const edgeIds = new Set(graph.edges.map((edge) => edge.edgeId));
  if (edgeIds.size !== graph.edges.length) throw new Error("portfolio graph contains duplicate edge IDs");
  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.fromNodeId) || !nodeIds.has(edge.toNodeId)) {
      throw new Error(`portfolio graph edge ${edge.edgeId} references a missing node`);
    }
    if (edge.fromNodeId === edge.toNodeId) throw new Error(`portfolio graph edge ${edge.edgeId} is self-referential`);
  }
}

export type { DecimalString };
