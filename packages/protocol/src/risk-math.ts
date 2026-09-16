import { absolute, BPS_SCALE, mulDivDown, WAD } from "./fixed-point.js";

export interface CollateralValue {
  valueUsdWad: bigint;
  liquidationThresholdBps: bigint;
}

export interface DeltaComponent {
  quantityWad: bigint;
  unitDeltaWad: bigint;
}

export function calculateHealthFactorWad(
  collateral: readonly CollateralValue[],
  debtUsdWad: bigint,
): bigint {
  if (debtUsdWad < 0n) {
    throw new RangeError("debt must be non-negative");
  }
  if (debtUsdWad === 0n) {
    return (1n << 256n) - 1n;
  }

  let adjustedCollateralUsdWad = 0n;
  for (const item of collateral) {
    if (item.valueUsdWad < 0n) {
      throw new RangeError("collateral value must be non-negative");
    }
    if (item.liquidationThresholdBps < 0n || item.liquidationThresholdBps > BPS_SCALE) {
      throw new RangeError("liquidation threshold must be valid basis points");
    }
    adjustedCollateralUsdWad += mulDivDown(
      item.valueUsdWad,
      item.liquidationThresholdBps,
      BPS_SCALE,
    );
  }
  return mulDivDown(adjustedCollateralUsdWad, WAD, debtUsdWad);
}

export function calculateNetDeltaWad(components: readonly DeltaComponent[]): bigint {
  let netDeltaWad = 0n;
  for (const component of components) {
    netDeltaWad += mulDivDown(component.quantityWad, component.unitDeltaWad, WAD);
  }
  return netDeltaWad;
}

export function isDeltaRebalanceEligible(
  currentDeltaWad: bigint,
  targetDeltaWad: bigint,
  toleranceWad: bigint,
): boolean {
  if (toleranceWad < 0n) {
    throw new RangeError("delta tolerance must be non-negative");
  }
  return absolute(currentDeltaWad - targetDeltaWad) > toleranceWad;
}

export function calculateNetApyBps(input: {
  grossYieldBps: bigint;
  borrowCostBps: bigint;
  hedgeCostBps: bigint;
  protocolFeeBps: bigint;
  amortizedExecutionCostBps: bigint;
}): bigint {
  return (
    input.grossYieldBps -
    input.borrowCostBps -
    input.hedgeCostBps -
    input.protocolFeeBps -
    input.amortizedExecutionCostBps
  );
}
