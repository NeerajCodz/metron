import type { Address, CanonicalIntent, RouteAction, SolverRoute } from "@metron/types";
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
  observedAtMs: number;
}

export interface RouteBuildContext {
  solverId: string;
  intentId: string;
  strategyPrefix: string;
  scoreVersion: string;
  now: number;
  markets: readonly RouteMarketSnapshot[];
  bridgeTarget?: Address;
  hedgeTarget?: Address;
  destinationMarkets?: readonly RouteMarketSnapshot[];
}

function routeId(context: RouteBuildContext, kind: string, market: RouteMarketSnapshot): string {
  return `${context.strategyPrefix}:${kind}:${market.chainId}:${market.asset.toLowerCase()}`;
}

function asHex(value: string): `0x${string}` {
  return value as `0x${string}`;
}

function strategyGraphFor(routeIdValue: string, actions: readonly RouteAction[]) {
  const stageFor = (action: RouteAction): "execution" | "settlement" => {
    return action.actionType === "cross_chain_message" ? "settlement" : "execution";
  };
  const nodes = actions.map((action, index) => ({
    nodeId: `${routeIdValue}:action:${index}`,
    stage: stageFor(action),
    action,
    dependsOn: index === 0 ? [] : [`${routeIdValue}:action:${index - 1}`],
  }));
  const firstNode = nodes[0];
  const lastNode = nodes[nodes.length - 1];
  return {
    graphId: `${routeIdValue}:graph`,
    nodes,
    entryNodeIds: firstNode ? [firstNode.nodeId] : [],
    terminalNodeIds: lastNode ? [lastNode.nodeId] : [],
  };
}

function actionTarget(
  target: Address,
  asset: Address,
  amount: string,
  actionType: "supply" | "add_liquidity",
): RouteAction {
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

function actionWithIndex(
  actionIndex: number,
  action: Omit<RouteAction, "actionIndex">,
): RouteAction {
  return { actionIndex, ...action };
}

export function buildCandidateRoutes(
  intent: CanonicalIntent,
  context: RouteBuildContext,
): SolverRoute[] {
  if (context.markets.length === 0) return [];
  const allowedChains = new Set(intent.chains);
  const allowedProtocols = new Set(intent.protocols);
  const allowedAssets = new Set(intent.assets.map((asset) => asset.toLowerCase()));
  const expiry = Math.min(intent.expiresAt, context.now + 300);
  const routes: SolverRoute[] = [];

  for (const market of context.markets) {
    if (!allowedChains.has(market.chainId) || !allowedAssets.has(market.asset.toLowerCase()))
      continue;
    if (allowedProtocols.has(PROTOCOL_IDS.aaveV3)) {
      routes.push({
        schemaVersion: "1.0.0",
        routeId: routeId(context, "lending", market),
        solverId: context.solverId,
        intentId: context.intentId,
        strategyId: `${routeId(context, "lending", market)}:strategy`,
        actions: [
          {
            ...actionTarget(
              market.lendingTarget,
              market.asset,
              intent.exposure.targetDeltaWad.replace(/^-/, ""),
              "supply",
            ),
            chainId: market.chainId,
          },
        ],
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
        actions: [
          {
            ...actionTarget(
              market.liquidityTarget,
              market.asset,
              intent.exposure.targetDeltaWad.replace(/^-/, ""),
              "add_liquidity",
            ),
            chainId: market.chainId,
          },
        ],
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
  return routes.map((route) => ({
    ...route,
    strategyGraph: strategyGraphFor(route.routeId, route.actions),
  }));
}

function average(left: number, right: number): number {
  return Math.round((left + right) / 2);
}

/**
 * Builds a composable strategy candidate instead of treating each protocol
 * action as a separate strategy. The caller still supplies executable targets
 * and market observations; this function only assembles and scores the graph.
 */
export function buildComposedCandidateRoutes(
  intent: CanonicalIntent,
  context: RouteBuildContext,
): SolverRoute[] {
  const destinations = context.destinationMarkets ?? context.markets;
  const allowedChains = new Set(intent.chains);
  const allowedProtocols = new Set(intent.protocols);
  const allowedAssets = new Set(intent.assets.map((asset) => asset.toLowerCase()));
  const expiry = Math.min(intent.expiresAt, context.now + 300);
  const routes: SolverRoute[] = [];

  if (
    !context.hedgeTarget ||
    !allowedProtocols.has(PROTOCOL_IDS.aaveV3) ||
    !allowedProtocols.has(PROTOCOL_IDS.uniswapV4)
  ) {
    return routes;
  }

  for (const source of context.markets) {
    for (const destination of destinations) {
      if (
        !allowedChains.has(source.chainId) ||
        !allowedChains.has(destination.chainId) ||
        !allowedAssets.has(source.asset.toLowerCase()) ||
        !allowedAssets.has(destination.asset.toLowerCase())
      ) {
        continue;
      }
      if (
        source.chainId !== destination.chainId &&
        source.asset.toLowerCase() !== destination.asset.toLowerCase()
      ) {
        continue;
      }

      const crossChain = source.chainId !== destination.chainId;
      const prefix = `${context.strategyPrefix}:composed:${source.chainId}:${destination.chainId}`;
      const actions: RouteAction[] = [];
      if (crossChain) {
        if (!context.bridgeTarget) {
          continue;
        }
        actions.push(
          actionWithIndex(0, {
            chainId: source.chainId,
            protocol: "layerzero-v2",
            actionType: "cross_chain_message",
            target: context.bridgeTarget,
            assetIn: source.asset,
            amount: intent.exposure.targetDeltaWad.replace(/^-/, ""),
            calldata: asHex("0x"),
          }),
        );
      }
      const destinationIndex = actions.length;
      actions.push(
        actionWithIndex(destinationIndex, {
          chainId: destination.chainId,
          protocol: PROTOCOL_IDS.aaveV3,
          actionType: "supply",
          target: destination.lendingTarget,
          assetIn: destination.asset,
          amount: intent.exposure.targetDeltaWad.replace(/^-/, ""),
          calldata: asHex("0x"),
        }),
        actionWithIndex(destinationIndex + 1, {
          chainId: destination.chainId,
          protocol: PROTOCOL_IDS.uniswapV4,
          actionType: "add_liquidity",
          target: destination.liquidityTarget,
          assetIn: destination.asset,
          amount: intent.exposure.targetDeltaWad.replace(/^-/, ""),
          calldata: asHex("0x"),
        }),
        actionWithIndex(destinationIndex + 2, {
          chainId: destination.chainId,
          protocol: "hedge",
          actionType: "adjust_hedge",
          target: context.hedgeTarget,
          assetIn: destination.asset,
          amount: intent.exposure.targetDeltaWad.replace(/^-/, ""),
          calldata: asHex("0x"),
        }),
      );
      routes.push({
        schemaVersion: "1.0.0",
        routeId: `${prefix}:${source.asset.toLowerCase()}`,
        solverId: context.solverId,
        intentId: context.intentId,
        strategyId: `${prefix}:strategy`,
        actions,
        expectedNetApyBps: average(source.expectedNetApyBps, destination.expectedNetApyBps),
        expectedDrawdownBps: Math.max(source.expectedDrawdownBps, destination.expectedDrawdownBps),
        expectedImpermanentLossBps: Math.max(
          source.expectedImpermanentLossBps,
          destination.expectedImpermanentLossBps,
        ),
        liquidationProbabilityBps: Math.max(
          source.liquidationProbabilityBps,
          destination.liquidationProbabilityBps,
        ),
        estimatedGasUsd: source.estimatedGasUsd,
        estimatedSlippageBps: Math.max(
          source.estimatedSlippageBps,
          destination.estimatedSlippageBps,
        ),
        bridgeCostUsd: crossChain ? source.bridgeCostUsd : "0",
        resultingDeltaWad: destination.resultingDeltaWad,
        resultingHealthFactorWad: destination.resultingHealthFactorWad,
        liquidityScoreBps: Math.min(source.liquidityScoreBps, destination.liquidityScoreBps),
        validityDeadline: expiry,
        scoreVersion: context.scoreVersion,
      });
    }
  }
  return routes.map((route) => ({
    ...route,
    strategyGraph: strategyGraphFor(route.routeId, route.actions),
  }));
}
