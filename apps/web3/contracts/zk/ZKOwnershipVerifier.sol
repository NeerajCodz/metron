// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IZKOwnershipProofVerifier {
    function verify(bytes calldata proof, bytes32[] calldata publicInputs) external view returns (bool);
}

contract ZKOwnershipVerifier {
    bytes32 public constant CIRCUIT_VERSION = keccak256("metron-ownership-v1");
    uint256 public constant PUBLIC_INPUT_COUNT = 3;
    IZKOwnershipProofVerifier public immutable verifier;
    mapping(bytes32 nullifier => bool consumed) public nullifiers;

    error InvalidAddress();
    error InvalidProofInputs();
    error InvalidProof();
    error NullifierConsumed(bytes32 nullifier);

    event OwnershipProofVerified(bytes32 indexed commitment, bytes32 indexed nullifier, bytes32 circuitVersion);

    constructor(IZKOwnershipProofVerifier verifier_) {
        if (address(verifier_) == address(0)) revert InvalidAddress();
        verifier = verifier_;
    }

    function verifyOwnership(bytes calldata proof, bytes32[] calldata publicInputs) external returns (bool) {
        if (proof.length == 0 || publicInputs.length != PUBLIC_INPUT_COUNT) revert InvalidProofInputs();
        bytes32 nullifier = publicInputs[2];
        if (nullifiers[nullifier]) revert NullifierConsumed(nullifier);
        if (!verifier.verify(proof, publicInputs)) revert InvalidProof();
        nullifiers[nullifier] = true;
        emit OwnershipProofVerified(publicInputs[1], nullifier, CIRCUIT_VERSION);
        return true;
    }
}
