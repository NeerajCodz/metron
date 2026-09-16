// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

library MetronTypes {
    enum OperationMode {
        NORMAL,
        RESTRICTED,
        EMERGENCY
    }

    enum IntentStatus {
        NONE,
        ACTIVE,
        SETTLED,
        CANCELLED,
        EXPIRED
    }

    enum PositionStatus {
        NONE,
        PENDING,
        ACTIVE,
        RESTRICTED,
        EMERGENCY,
        UNWINDING,
        CLOSED,
        FAILED
    }

    enum ActionRisk {
        RISK_REDUCING,
        NEUTRAL,
        RISK_INCREASING
    }

    struct AutomationPolicy {
        uint16 maxCapitalMoveBps;
        uint16 maxCollateralSaleBps;
        uint16 maxSlippageBps;
        uint128 maxRepaymentAmount;
        uint128 maxGasFeeWei;
        uint256 minHealthFactorWad;
        bool rebalanceEnabled;
        bool recoveryEnabled;
        bool emergencyUnwindEnabled;
    }

    struct IntentAuthorization {
        address owner;
        bytes32 commitment;
        bytes32 policyHash;
        uint256 nonce;
        uint64 expiresAt;
        int256 targetDeltaWad;
        uint256 deltaToleranceWad;
        IntentStatus status;
    }

    struct ExecutionConstraints {
        uint16 slippageBps;
        uint16 capitalMoveBps;
        uint256 repaymentAmount;
        uint256 resultingHealthFactorWad;
        uint256 gasFeeWei;
        ActionRisk actionRisk;
    }

    struct StrategyAction {
        address adapter;
        address asset;
        uint256 amount;
        bytes data;
        ExecutionConstraints constraints;
    }
}
