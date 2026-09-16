import type { Address, CanonicalIntent, SolverRoute } from "@metron/types";
import { PROTOCOL_IDS } from "@metron/config";

export interface RouteMarketSnapshot {
  chainId: number;
  asset: Address;
  lendingTarget: Address;
  liquidityTarget: Address;
  expectedNetApyBps: number;
  expectedDrawdownBps: number;
  expectedImpermanentLossBps: number;
  liquidationProbabilityBps: number;
  estimatedGasUsd: string;
  estimatedSlippageBps: number;
  bridgeCostUsd: string;
  resultingDeltaWad: string;
  resultingHealthFactorWad: string;
  liquidityScoreBps: number;
  observedAt: number;
}

export interface RouteBuildContext {
  solverId: string;
  intentId: string;
  strategyPrefix: string;
  scoreVersion: string;
  now: number;
  markets: readonly RouteMarketSnapshot[];
}

function routeId(context: RouteBuildContext, kind: string, market: RouteMarketSnapshot): string {
  return `${context.strategyPrefix}:${kind}:${market.chainId}:${market.asset.toLowerCase()}`;
}

function asHex(value: string): `0x${string}` {
  return value as `0x${string}`;
}

function actionTarget(target: Address, asset: Address, amount: string, actionType: "supply" | "add_liquidity") {
  return {
    actionIndex: 0,
    chainId: 0,
    protocol: actionType === "supply" ? PROTOCOL_IDS.aaveV3 : PROTOCOL_IDS.uniswapV4,
    actionType,
    target,
    assetIn: asset,
    amount,
    calldata: asHex("0x"),
  };
}

export function buildCandidateRoutes(intent: CanonicalIntent, context: RouteBuildContext): SolverRoute[] {
  if (context.markets.length === 0) return [];
  const allowedChains = new Set(intent.chains);
  const allowedProtocols = new Set(intent.protocols);
  const allowedAssets = new Set(intent.assets.map((asset) => asset.toLowerCase()));
  const expiry = Math.min(intent.expiresAt, context.now + 300);
  const routes: SolverRoute[] = [];

  for (const market of context.markets) {
    if (!allowedChains.has(market.chainId) || !allowedAssets.has(market.asset.toLowerCase())) continue;
    if (allowedProtocols.has(PROTOCOL_IDS.aaveV3)) {
      routes.push({
        schemaVersion: "1.0.0",
        routeId: routeId(context, "lending", market),
        solverId: context.solverId,
        intentId: context.intentId,
        strategyId: `${routeId(context, "lending", market)}:strategy`,
        actions: [{ ...actionTarget(market.lendingTarget, market.asset, "0", "supply"), chainId: market.chainId }],
        expectedNetApyBps: market.expectedNetApyBps,
        expectedDrawdownBps: market.expectedDrawdownBps,
        expectedImpermanentLossBps: 0,
        liquidationProbabilityBps: market.liquidationProbabilityBps,
        estimatedGasUsd: market.estimatedGasUsd,
        estimatedSlippageBps: market.estimatedSlippageBps,
        bridgeCostUsd: market.bridgeCostUsd,
        resultingDeltaWad: market.resultingDeltaWad,
        resultingHealthFactorWad: market.resultingHealthFactorWad,
        liquidityScoreBps: market.liquidityScoreBps,
        validityDeadline: expiry,
        scoreVersion: context.scoreVersion,
      });
    }
    if (allowedProtocols.has(PROTOCOL_IDS.uniswapV4)) {
      routes.push({
        schemaVersion: "1.0.0",
        routeId: routeId(context, "liquidity", market),
        solverId: context.solverId,
        intentId: context.intentId,
        strategyId: `${routeId(context, "liquidity", market)}:strategy`,
        actions: [{ ...actionTarget(market.liquidityTarget, market.asset, "0", "add_liquidity"), chainId: market.chainId }],
        expectedNetApyBps: market.expectedNetApyBps,
        expectedDrawdownBps: market.expectedDrawdownBps,
        expectedImpermanentLossBps: market.expectedImpermanentLossBps,
        liquidationProbabilityBps: market.liquidationProbabilityBps,
        estimatedGasUsd: market.estimatedGasUsd,
        estimatedSlippageBps: market.estimatedSlippageBps,
        bridgeCostUsd: market.bridgeCostUsd,
        resultingDeltaWad: market.resultingDeltaWad,
        resultingHealthFactorWad: market.resultingHealthFactorWad,
        liquidityScoreBps: market.liquidityScoreBps,
        validityDeadline: expiry,
        scoreVersion: context.scoreVersion,
      });
    }
  }
  return routes;
}
