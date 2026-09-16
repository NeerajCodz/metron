// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {Test} from "forge-std/Test.sol";
import {IntentManager} from "../../contracts/core/IntentManager.sol";
import {MetronTypes} from "../../contracts/libraries/MetronTypes.sol";

contract IntentManagerTest is Test {
    uint256 private constant OWNER_PRIVATE_KEY = 0xB0B;
    bytes32 private constant AAVE_PROTOCOL = keccak256("aave-v3");
    bytes32 private constant UNISWAP_PROTOCOL = keccak256("uniswap-v4");

    address private admin = makeAddr("admin");
    address private owner;
    address private relayer = makeAddr("relayer");
    address private settler = makeAddr("settler");
    address private usdc = makeAddr("usdc");
    address private weth = makeAddr("weth");

    IntentManager private manager;
    bytes32 private settlerRole;

    function setUp() public {
        owner = vm.addr(OWNER_PRIVATE_KEY);
        manager = new IntentManager(admin);
        settlerRole = manager.SETTLER_ROLE();

        vm.prank(admin);
        manager.grantRole(settlerRole, settler);
    }

    function test_OwnerSubmitsIntentWithExplicitAllowlists() public {
        (uint256[] memory chains, bytes32[] memory protocols, address[] memory assets) = _allowlists();
        IntentManager.IntentSubmission memory submission = _submission(chains, protocols, assets);

        vm.prank(owner);
        bytes32 intentId = manager.submitIntent(submission, chains, protocols, assets);

        MetronTypes.IntentAuthorization memory authorization = manager.getIntent(intentId);
        assertEq(authorization.owner, owner);
        assertEq(authorization.traceId, submission.traceId);
        assertEq(uint256(authorization.status), uint256(MetronTypes.IntentStatus.ACTIVE));
        assertTrue(manager.allowedChains(intentId, 421_614));
        assertTrue(manager.allowedProtocols(intentId, AAVE_PROTOCOL));
        assertTrue(manager.allowedAssets(intentId, usdc));
        assertTrue(manager.isExecutionAuthorized(intentId, 421_614, AAVE_PROTOCOL, usdc));
    }

    function test_RelayerSubmitsSignedIntentOnlyOnce() public {
        (uint256[] memory chains, bytes32[] memory protocols, address[] memory assets) = _allowlists();
        IntentManager.IntentSubmission memory submission = _submission(chains, protocols, assets);
        bytes memory signature = _sign(submission);

        vm.startPrank(relayer);
        manager.submitIntentWithSignature(submission, chains, protocols, assets, signature);
        vm.expectRevert(abi.encodeWithSelector(IntentManager.InvalidNonce.selector, 1, 0));
        manager.submitIntentWithSignature(submission, chains, protocols, assets, signature);
        vm.stopPrank();
    }

    function test_RejectsAllowlistsThatDoNotMatchSignedHashes() public {
        (uint256[] memory chains, bytes32[] memory protocols, address[] memory assets) = _allowlists();
        IntentManager.IntentSubmission memory submission = _submission(chains, protocols, assets);
        chains[0] = 1;

        vm.prank(owner);
        vm.expectRevert(IntentManager.AllowlistHashMismatch.selector);
        manager.submitIntent(submission, chains, protocols, assets);
    }

    function test_RejectsDuplicateAllowlistEntries() public {
        (uint256[] memory chains, bytes32[] memory protocols, address[] memory assets) = _allowlists();
        chains[1] = chains[0];
        IntentManager.IntentSubmission memory submission = _submission(chains, protocols, assets);

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(IntentManager.DuplicateChain.selector, chains[0]));
        manager.submitIntent(submission, chains, protocols, assets);
    }

    function test_OnlySettlerRoleCanSettleActiveIntent() public {
        bytes32 intentId = _submitAsOwner();

        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, owner, settlerRole)
        );
        manager.settleIntent(intentId);

        vm.prank(settler);
        manager.settleIntent(intentId);
        assertEq(uint256(manager.getIntent(intentId).status), uint256(MetronTypes.IntentStatus.SETTLED));
    }

    function test_OwnerCanCancelButAnotherAccountCannot() public {
        bytes32 intentId = _submitAsOwner();

        vm.prank(relayer);
        vm.expectRevert(abi.encodeWithSelector(IntentManager.UnauthorizedOwner.selector, relayer, owner));
        manager.cancelIntent(intentId);

        vm.prank(owner);
        manager.cancelIntent(intentId);
        assertEq(uint256(manager.getIntent(intentId).status), uint256(MetronTypes.IntentStatus.CANCELLED));
    }

    function test_ExpiredIntentCannotAuthorizeExecution() public {
        bytes32 intentId = _submitAsOwner();
        uint64 expiry = manager.getIntent(intentId).expiresAt;
        vm.warp(uint256(expiry) + 1);

        assertFalse(manager.isExecutionAuthorized(intentId, 421_614, AAVE_PROTOCOL, usdc));
        manager.markExpired(intentId);
        assertEq(uint256(manager.getIntent(intentId).status), uint256(MetronTypes.IntentStatus.EXPIRED));
    }

    function _submitAsOwner() private returns (bytes32 intentId) {
        (uint256[] memory chains, bytes32[] memory protocols, address[] memory assets) = _allowlists();
        IntentManager.IntentSubmission memory submission = _submission(chains, protocols, assets);
        vm.prank(owner);
        return manager.submitIntent(submission, chains, protocols, assets);
    }

    function _allowlists()
        private
        view
        returns (uint256[] memory chains, bytes32[] memory protocols, address[] memory assets)
    {
        chains = new uint256[](2);
        chains[0] = 421_614;
        chains[1] = 84_532;

        protocols = new bytes32[](2);
        protocols[0] = AAVE_PROTOCOL;
        protocols[1] = UNISWAP_PROTOCOL;

        assets = new address[](2);
        assets[0] = usdc;
        assets[1] = weth;
    }

    function _submission(uint256[] memory chains, bytes32[] memory protocols, address[] memory assets)
        private
        view
        returns (IntentManager.IntentSubmission memory)
    {
        return IntentManager.IntentSubmission({
            owner: owner,
            traceId: keccak256("trace-1"),
            commitment: keccak256("private-intent"),
            policyHash: keccak256("automation-policy"),
            nonce: manager.nonces(owner),
            expiresAt: uint64(block.timestamp + 1 days),
            targetDeltaWad: 0,
            deltaToleranceWad: 0.1e18,
            chainsHash: keccak256(abi.encodePacked(chains)),
            protocolsHash: keccak256(abi.encodePacked(protocols)),
            assetsHash: keccak256(abi.encodePacked(assets))
        });
    }

    function _sign(IntentManager.IntentSubmission memory submission) private view returns (bytes memory) {
        bytes32 digest = manager.hashIntentSubmission(submission);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(OWNER_PRIVATE_KEY, digest);
        return abi.encodePacked(r, s, v);
    }
}
