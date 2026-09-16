// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {CircuitBreaker} from "../../contracts/emergency/CircuitBreaker.sol";
import {InsuranceReserve} from "../../contracts/emergency/InsuranceReserve.sol";
import {MetronTypes} from "../../contracts/libraries/MetronTypes.sol";

contract MockInsuranceToken is ERC20 {
    constructor() ERC20("Mock USD", "mUSD") {}
    function mint(address to, uint256 amount) external { _mint(to, amount); }
}

contract EmergencyControlsTest is Test {
    address internal admin = address(0xA11CE);
    address internal beneficiary = address(0xBEEF);
    CircuitBreaker internal breaker;
    MockInsuranceToken internal token;
    InsuranceReserve internal reserve;

    function setUp() external {
        breaker = new CircuitBreaker(admin);
        token = new MockInsuranceToken();
        reserve = new InsuranceReserve(admin, token, 1_000e18);
        token.mint(admin, 1_000e18);
        vm.startPrank(admin);
        token.approve(address(reserve), type(uint256).max);
        reserve.fund(500e18);
        reserve.configureCoverage(keccak256("coverage"), beneficiary, 100e18, uint64(block.timestamp + 1 days));
        reserve.configureEvidence(keccak256("oracle-divergence"), InsuranceReserve.TriggerKind.ORACLE_DIVERGENCE, true);
        vm.stopPrank();
    }

    function testRestrictedAndEmergencyOnlyAllowSafeOperations() external {
        vm.prank(admin);
        breaker.setMode(MetronTypes.OperationMode.RESTRICTED, keccak256("oracle-stale"));
        assertTrue(breaker.canExecute(MetronTypes.ActionRisk.RISK_REDUCING, false, false));
        assertFalse(breaker.canExecute(MetronTypes.ActionRisk.RISK_INCREASING, false, false));
        vm.prank(admin);
        breaker.setMode(MetronTypes.OperationMode.EMERGENCY, keccak256("protocol-incident"));
        assertTrue(breaker.canExecute(MetronTypes.ActionRisk.RISK_INCREASING, true, false));
        assertFalse(breaker.canExecute(MetronTypes.ActionRisk.RISK_INCREASING, false, false));
    }

    function testInsuranceRequiresVerifiedEvidenceAndCapsClaims() external {
        bytes32 coverageId = keccak256("coverage");
        bytes32 evidence = keccak256("oracle-divergence");
        vm.startPrank(admin);
        vm.expectRevert(abi.encodeWithSelector(InsuranceReserve.TriggerNotVerified.selector, keccak256("unverified")));
        reserve.claim(coverageId, 10e18, InsuranceReserve.TriggerKind.ORACLE_DIVERGENCE, keccak256("unverified"), keccak256("claim-1"));
        reserve.claim(coverageId, 60e18, InsuranceReserve.TriggerKind.ORACLE_DIVERGENCE, evidence, keccak256("claim-1"));
        vm.expectRevert();
        reserve.claim(coverageId, 50e18, InsuranceReserve.TriggerKind.ORACLE_DIVERGENCE, evidence, keccak256("claim-2"));
        vm.stopPrank();
        assertEq(token.balanceOf(beneficiary), 60e18);
    }
}
