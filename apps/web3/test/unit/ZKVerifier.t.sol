// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {IZKIntentProofVerifier, ZKIntentVerifier} from "../../contracts/zk/ZKIntentVerifier.sol";
import {IZKOwnershipProofVerifier, ZKOwnershipVerifier} from "../../contracts/zk/ZKOwnershipVerifier.sol";
import {IZKCollateralProofVerifier, ZKCollateralVerifier} from "../../contracts/zk/ZKCollateralVerifier.sol";

contract MockGeneratedVerifier is IZKIntentProofVerifier, IZKOwnershipProofVerifier, IZKCollateralProofVerifier {
    function verify(bytes calldata proof, bytes32[] calldata)
        external
        pure
        override(IZKIntentProofVerifier, IZKOwnershipProofVerifier, IZKCollateralProofVerifier)
        returns (bool)
    {
        return proof.length == 1 && proof[0] == bytes1(0x01);
    }
}

contract ZKVerifierTest is Test {
    MockGeneratedVerifier internal generated;
    ZKIntentVerifier internal intent;
    ZKOwnershipVerifier internal ownership;
    ZKCollateralVerifier internal collateral;

    function setUp() external {
        generated = new MockGeneratedVerifier();
        intent = new ZKIntentVerifier(generated);
        ownership = new ZKOwnershipVerifier(generated);
        collateral = new ZKCollateralVerifier(generated);
    }

    function testIntentAndCollateralRequireGeneratedVerifierSuccess() external {
        bytes32[] memory intentInputs = new bytes32[](10);
        intentInputs[9] = bytes32(uint256(42));
        vm.expectRevert(ZKIntentVerifier.InvalidProofInputs.selector);
        intent.verifyIntent(bytes(""), intentInputs);
        assertTrue(intent.verifyIntent(hex"01", intentInputs));

        bytes32[] memory collateralInputs = new bytes32[](2);
        collateralInputs[0] = bytes32(uint256(7));
        assertTrue(collateral.verifyCollateral(hex"01", collateralInputs));
    }

    function testOwnershipNullifierCannotBeReused() external {
        bytes32[] memory inputs = new bytes32[](3);
        inputs[1] = bytes32(uint256(9));
        inputs[2] = bytes32(uint256(10));
        assertTrue(ownership.verifyOwnership(hex"01", inputs));
        vm.expectRevert(abi.encodeWithSelector(ZKOwnershipVerifier.NullifierConsumed.selector, inputs[2]));
        ownership.verifyOwnership(hex"01", inputs);
    }
}
