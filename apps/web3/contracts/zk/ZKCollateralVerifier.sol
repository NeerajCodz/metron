// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IZKCollateralProofVerifier {
    function verify(bytes calldata proof, bytes32[] calldata publicInputs) external view returns (bool);
}

contract ZKCollateralVerifier {
    bytes32 public constant CIRCUIT_VERSION = keccak256("metron-collateral-v1");
    uint256 public constant PUBLIC_INPUT_COUNT = 2;
    IZKCollateralProofVerifier public immutable verifier;

    error InvalidAddress();
    error InvalidProofInputs();
    error InvalidProof();

    event CollateralProofVerified(bytes32 indexed commitment, bytes32 indexed circuitVersion);

    constructor(IZKCollateralProofVerifier verifier_) {
        if (address(verifier_) == address(0)) revert InvalidAddress();
        verifier = verifier_;
    }

    function verifyCollateral(bytes calldata proof, bytes32[] calldata publicInputs) external returns (bool) {
        if (proof.length == 0 || publicInputs.length != PUBLIC_INPUT_COUNT) revert InvalidProofInputs();
        if (!verifier.verify(proof, publicInputs)) revert InvalidProof();
        emit CollateralProofVerified(publicInputs[0], CIRCUIT_VERSION);
        return true;
    }
}
