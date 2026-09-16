import type {
  Address,
  BasisPoints,
  Bytes32,
  ChainId,
  IntentId,
  PercentageBps,
  RouteId,
  SolverId,
  StrategyId,
  UnixSeconds,
  UsdAmount,
  VersionedPayload,
} from "./primitives.js";

export const SOLVER_ROUTE_SCHEMA_VERSION = "1.0.0" as const;

export type RouteActionType =
  | "deposit"
  | "supply"
  | "borrow"
  | "repay"
  | "withdraw"
  | "swap"
  | "add_liquidity"
  | "remove_liquidity"
  | "open_hedge"
  | "adjust_hedge"
  | "cross_chain_message"
  | "safe_state";

export interface RouteAction {
  actionIndex: number;
  chainId: ChainId;
  protocol: string;
  actionType: RouteActionType;
  target: Address;
  assetIn?: Address;
  assetOut?: Address;
  amount: string;
  minimumOutput?: string;
  calldata: `0x${string}`;
}

export interface SolverRoute extends VersionedPayload {
  schemaVersion: typeof SOLVER_ROUTE_SCHEMA_VERSION;
  routeId: RouteId;
  solverId: SolverId;
  intentId: IntentId;
  strategyId: StrategyId;
  actions: RouteAction[];
  strategyGraph?: StrategyGraph;
  expectedNetApyBps: BasisPoints;
  expectedDrawdownBps: PercentageBps;
  expectedImpermanentLossBps?: PercentageBps;
  liquidationProbabilityBps: PercentageBps;
  estimatedGasUsd: UsdAmount;
  estimatedSlippageBps: BasisPoints;
  bridgeCostUsd: UsdAmount;
  resultingDeltaWad: string;
  resultingHealthFactorWad?: string;
  liquidityScoreBps: BasisPoints;
  validityDeadline: UnixSeconds;
  scoreVersion: string;
}

export interface StrategyGraphNode {
  nodeId: string;
  action: RouteAction;
  dependsOn: string[];
}

export interface StrategyGraph {
  graphId: string;
  nodes: StrategyGraphNode[];
  entryNodeIds: string[];
  terminalNodeIds: string[];
}

export interface SolverBidCommit {
  intentId: IntentId;
  solverId: SolverId;
  commitment: Bytes32;
  committedAt: UnixSeconds;
}

export interface SolverBidReveal {
  route: SolverRoute;
  salt: Bytes32;
  revealedAt: UnixSeconds;
}

export interface RouteScoreBreakdown {
  routeId: RouteId;
  scoreVersion: string;
  totalScore: string;
  yieldScore: string;
  costPenalty: string;
  slippagePenalty: string;
  liquidityScore: string;
  drawdownPenalty: string;
  liquidationPenalty: string;
  impermanentLossPenalty: string;
  crossChainPenalty: string;
  deltaPenalty: string;
  healthPenalty: string;
  constraintsSatisfied: boolean;
  rejectionReasons: string[];
}
