// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IZKIntentProofVerifier {
    function verify(bytes calldata proof, bytes32[] calldata publicInputs) external view returns (bool);
}

contract ZKIntentVerifier {
    bytes32 public constant CIRCUIT_VERSION = keccak256("metron-intent-v1");
    uint256 public constant PUBLIC_INPUT_COUNT = 10;
    IZKIntentProofVerifier public immutable verifier;

    error InvalidAddress();
    error InvalidProofInputs();
    error InvalidProof();

    event IntentProofVerified(bytes32 indexed commitment, bytes32 indexed circuitVersion);

    constructor(IZKIntentProofVerifier verifier_) {
        if (address(verifier_) == address(0)) revert InvalidAddress();
        verifier = verifier_;
    }

    function verifyIntent(bytes calldata proof, bytes32[] calldata publicInputs) external returns (bool) {
        if (proof.length == 0 || publicInputs.length != PUBLIC_INPUT_COUNT) revert InvalidProofInputs();
        if (!verifier.verify(proof, publicInputs)) revert InvalidProof();
        emit IntentProofVerified(publicInputs[9], CIRCUIT_VERSION);
        return true;
    }
}
