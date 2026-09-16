// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script} from "forge-std/Script.sol";
import {CircuitBreaker} from "../contracts/emergency/CircuitBreaker.sol";
import {IntentManager} from "../contracts/core/IntentManager.sol";
import {PositionManager} from "../contracts/core/PositionManager.sol";
import {RecoveryExecutor} from "../contracts/core/RecoveryExecutor.sol";
import {RiskController} from "../contracts/risk/RiskController.sol";
import {StrategyExecutor} from "../contracts/core/StrategyExecutor.sol";
import {Vault} from "../contracts/core/Vault.sol";
import {MetronTypes} from "../contracts/libraries/MetronTypes.sol";

contract Deploy is Script {
    struct Deployment {
        CircuitBreaker breaker;
        IntentManager intentManager;
        Vault vault;
        PositionManager positionManager;
        RiskController riskController;
        StrategyExecutor strategyExecutor;
        RecoveryExecutor recoveryExecutor;
    }

    function run() external returns (Deployment memory deployment) {
        address admin = vm.envAddress("EXPECTED_ADMIN_ADDRESS");
        if (admin == address(0)) revert("EXPECTED_ADMIN_ADDRESS is zero");

        MetronTypes.AutomationPolicy memory protocolLimits = MetronTypes.AutomationPolicy({
            maxCapitalMoveBps: 10_000,
            maxCollateralSaleBps: 10_000,
            maxSlippageBps: 1_000,
            maxRepaymentAmount: type(uint128).max,
            maxGasFeeWei: 1 ether,
            minHealthFactorWad: 1.1e18,
            rebalanceEnabled: true,
            recoveryEnabled: true,
            emergencyUnwindEnabled: true
        });

        vm.startBroadcast();
        deployment.breaker = new CircuitBreaker(admin);
        deployment.intentManager = new IntentManager(admin);
        deployment.vault = new Vault(admin);
        deployment.positionManager = new PositionManager(admin, deployment.intentManager);
        deployment.riskController = new RiskController(admin, deployment.intentManager, protocolLimits);
        deployment.strategyExecutor = new StrategyExecutor(
            admin,
            deployment.intentManager,
            deployment.positionManager,
            deployment.riskController,
            deployment.vault
        );
        deployment.recoveryExecutor = new RecoveryExecutor(
            admin,
            deployment.intentManager,
            deployment.positionManager,
            deployment.riskController,
            deployment.vault
        );

        deployment.intentManager.grantRole(
            deployment.intentManager.SETTLER_ROLE(), address(deployment.strategyExecutor)
        );
        deployment.vault.grantRole(deployment.vault.EXECUTOR_ROLE(), address(deployment.strategyExecutor));
        deployment.vault.grantRole(deployment.vault.EXECUTOR_ROLE(), address(deployment.recoveryExecutor));
        deployment.positionManager.grantRole(
            deployment.positionManager.EXECUTOR_ROLE(), address(deployment.strategyExecutor)
        );
        deployment.recoveryExecutor.grantRole(
            deployment.recoveryExecutor.EXECUTOR_ROLE(), admin
        );
        vm.stopBroadcast();
    }
}
