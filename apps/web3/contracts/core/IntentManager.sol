// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IIntentManager} from "../interfaces/IIntentManager.sol";
import {MetronTypes} from "../libraries/MetronTypes.sol";

contract IntentManager is AccessControl, EIP712, Pausable, IIntentManager {
    bytes32 public constant SETTLER_ROLE = keccak256("SETTLER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant INTENT_TYPEHASH = keccak256(
        "IntentSubmission(address owner,bytes32 traceId,bytes32 commitment,bytes32 policyHash,uint256 nonce,uint64 expiresAt,int256 targetDeltaWad,uint256 deltaToleranceWad,bytes32 chainsHash,bytes32 protocolsHash,bytes32 assetsHash)"
    );

    struct IntentSubmission {
        address owner;
        bytes32 traceId;
        bytes32 commitment;
        bytes32 policyHash;
        uint256 nonce;
        uint64 expiresAt;
        int256 targetDeltaWad;
        uint256 deltaToleranceWad;
        bytes32 chainsHash;
        bytes32 protocolsHash;
        bytes32 assetsHash;
    }

    error InvalidAddress();
    error InvalidIdentifier();
    error InvalidExpiry(uint64 expiresAt);
    error InvalidNonce(uint256 expected, uint256 received);
    error InvalidSigner(address expected, address recovered);
    error EmptyAllowlist();
    error AllowlistHashMismatch();
    error DuplicateChain(uint256 chainId);
    error DuplicateProtocol(bytes32 protocolId);
    error DuplicateAsset(address asset);
    error IntentNotActive(bytes32 intentId);
    error IntentExpired(bytes32 intentId);
    error UnauthorizedOwner(address caller, address owner);

    mapping(bytes32 intentId => MetronTypes.IntentAuthorization authorization) private intents;
    mapping(bytes32 intentId => mapping(uint256 chainId => bool allowed)) public allowedChains;
    mapping(bytes32 intentId => mapping(bytes32 protocolId => bool allowed)) public allowedProtocols;
    mapping(bytes32 intentId => mapping(address asset => bool allowed)) public allowedAssets;
    mapping(address owner => uint256 nonce) public nonces;

    event IntentSubmitted(
        bytes32 indexed intentId,
        address indexed owner,
        bytes32 indexed traceId,
        bytes32 commitment,
        bytes32 policyHash,
        uint256 nonce,
        uint64 expiresAt
    );
    event IntentSettled(bytes32 indexed intentId, address indexed settler, bytes32 indexed traceId);
    event IntentCancelled(bytes32 indexed intentId, address indexed owner, bytes32 indexed traceId);
    event IntentExpiredEvent(bytes32 indexed intentId, bytes32 indexed traceId);

    constructor(address admin) EIP712("Metron Intent Manager", "1") {
        if (admin == address(0)) revert InvalidAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    function submitIntent(
        IntentSubmission calldata submission,
        uint256[] calldata chains,
        bytes32[] calldata protocols,
        address[] calldata assets
    ) external whenNotPaused returns (bytes32 intentId) {
        if (msg.sender != submission.owner) {
            revert UnauthorizedOwner(msg.sender, submission.owner);
        }
        intentId = _submit(submission, chains, protocols, assets);
    }

    function submitIntentWithSignature(
        IntentSubmission calldata submission,
        uint256[] calldata chains,
        bytes32[] calldata protocols,
        address[] calldata assets,
        bytes calldata signature
    ) external whenNotPaused returns (bytes32 intentId) {
        _validateAllowlistHashes(submission, chains, protocols, assets);
        bytes32 digest = _hashTypedDataV4(_hashIntentSubmission(submission));
        address recovered = ECDSA.recover(digest, signature);
        if (recovered != submission.owner) revert InvalidSigner(submission.owner, recovered);
        intentId = _submitValidated(submission, chains, protocols, assets);
    }

    function settleIntent(bytes32 intentId) external onlyRole(SETTLER_ROLE) whenNotPaused {
        MetronTypes.IntentAuthorization storage authorization = intents[intentId];
        _requireActive(intentId, authorization);
        authorization.status = MetronTypes.IntentStatus.SETTLED;
        emit IntentSettled(intentId, msg.sender, authorization.traceId);
    }

    function cancelIntent(bytes32 intentId) external {
        MetronTypes.IntentAuthorization storage authorization = intents[intentId];
        if (msg.sender != authorization.owner) {
            revert UnauthorizedOwner(msg.sender, authorization.owner);
        }
        _requireActive(intentId, authorization);
        authorization.status = MetronTypes.IntentStatus.CANCELLED;
        emit IntentCancelled(intentId, msg.sender, authorization.traceId);
    }

    function markExpired(bytes32 intentId) external {
        MetronTypes.IntentAuthorization storage authorization = intents[intentId];
        if (authorization.status != MetronTypes.IntentStatus.ACTIVE) {
            revert IntentNotActive(intentId);
        }
        if (block.timestamp <= authorization.expiresAt) revert InvalidExpiry(authorization.expiresAt);
        authorization.status = MetronTypes.IntentStatus.EXPIRED;
        emit IntentExpiredEvent(intentId, authorization.traceId);
    }

    function isExecutionAuthorized(bytes32 intentId, uint256 chainId, bytes32 protocolId, address asset)
        external
        view
        override
        returns (bool)
    {
        MetronTypes.IntentAuthorization storage authorization = intents[intentId];
        return authorization.status == MetronTypes.IntentStatus.ACTIVE && block.timestamp <= authorization.expiresAt
            && allowedChains[intentId][chainId] && allowedProtocols[intentId][protocolId]
            && allowedAssets[intentId][asset];
    }

    function getIntent(bytes32 intentId) external view override returns (MetronTypes.IntentAuthorization memory) {
        return intents[intentId];
    }

    function hashIntentSubmission(IntentSubmission calldata submission) external view returns (bytes32) {
        return _hashTypedDataV4(_hashIntentSubmission(submission));
    }

    function computeIntentId(address owner, bytes32 commitment, uint256 nonce) public pure returns (bytes32) {
        return keccak256(abi.encode(owner, commitment, nonce));
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _submit(
        IntentSubmission calldata submission,
        uint256[] calldata chains,
        bytes32[] calldata protocols,
        address[] calldata assets
    ) private returns (bytes32 intentId) {
        _validateAllowlistHashes(submission, chains, protocols, assets);
        return _submitValidated(submission, chains, protocols, assets);
    }

    function _submitValidated(
        IntentSubmission calldata submission,
        uint256[] calldata chains,
        bytes32[] calldata protocols,
        address[] calldata assets
    ) private returns (bytes32 intentId) {
        intentId = _createIntent(submission);
        _storeAllowlists(intentId, chains, protocols, assets);
    }

    function _createIntent(IntentSubmission calldata submission) private returns (bytes32 intentId) {
        if (submission.owner == address(0)) revert InvalidAddress();
        if (
            submission.traceId == bytes32(0) || submission.commitment == bytes32(0)
                || submission.policyHash == bytes32(0)
        ) revert InvalidIdentifier();
        if (submission.expiresAt <= block.timestamp) revert InvalidExpiry(submission.expiresAt);

        uint256 expectedNonce = nonces[submission.owner];
        if (submission.nonce != expectedNonce) {
            revert InvalidNonce(expectedNonce, submission.nonce);
        }
        nonces[submission.owner] = expectedNonce + 1;

        intentId = computeIntentId(submission.owner, submission.commitment, submission.nonce);
        if (intents[intentId].status != MetronTypes.IntentStatus.NONE) revert InvalidIdentifier();
        intents[intentId] = MetronTypes.IntentAuthorization({
            owner: submission.owner,
            traceId: submission.traceId,
            commitment: submission.commitment,
            policyHash: submission.policyHash,
            nonce: submission.nonce,
            expiresAt: submission.expiresAt,
            targetDeltaWad: submission.targetDeltaWad,
            deltaToleranceWad: submission.deltaToleranceWad,
            status: MetronTypes.IntentStatus.ACTIVE
        });

        emit IntentSubmitted(
            intentId,
            submission.owner,
            submission.traceId,
            submission.commitment,
            submission.policyHash,
            submission.nonce,
            submission.expiresAt
        );
    }

    function _validateAllowlistHashes(
        IntentSubmission calldata submission,
        uint256[] calldata chains,
        bytes32[] calldata protocols,
        address[] calldata assets
    ) private pure {
        if (chains.length == 0 || protocols.length == 0 || assets.length == 0) {
            revert EmptyAllowlist();
        }
        if (
            submission.chainsHash != keccak256(abi.encodePacked(chains))
                || submission.protocolsHash != keccak256(abi.encodePacked(protocols))
                || submission.assetsHash != keccak256(abi.encodePacked(assets))
        ) revert AllowlistHashMismatch();
    }

    function _storeAllowlists(
        bytes32 intentId,
        uint256[] calldata chains,
        bytes32[] calldata protocols,
        address[] calldata assets
    ) private {
        for (uint256 index = 0; index < chains.length; ++index) {
            uint256 chainId = chains[index];
            if (chainId == 0) revert InvalidIdentifier();
            if (allowedChains[intentId][chainId]) revert DuplicateChain(chainId);
            allowedChains[intentId][chainId] = true;
        }
        for (uint256 index = 0; index < protocols.length; ++index) {
            bytes32 protocolId = protocols[index];
            if (protocolId == bytes32(0)) revert InvalidIdentifier();
            if (allowedProtocols[intentId][protocolId]) revert DuplicateProtocol(protocolId);
            allowedProtocols[intentId][protocolId] = true;
        }
        for (uint256 index = 0; index < assets.length; ++index) {
            address asset = assets[index];
            if (asset == address(0)) revert InvalidAddress();
            if (allowedAssets[intentId][asset]) revert DuplicateAsset(asset);
            allowedAssets[intentId][asset] = true;
        }
    }

    function _requireActive(bytes32 intentId, MetronTypes.IntentAuthorization storage authorization) private view {
        if (authorization.status != MetronTypes.IntentStatus.ACTIVE) {
            revert IntentNotActive(intentId);
        }
        if (block.timestamp > authorization.expiresAt) revert IntentExpired(intentId);
    }

    function _hashIntentSubmission(IntentSubmission calldata submission) private pure returns (bytes32) {
        return keccak256(
            abi.encode(
                INTENT_TYPEHASH,
                submission.owner,
                submission.traceId,
                submission.commitment,
                submission.policyHash,
                submission.nonce,
                submission.expiresAt,
                submission.targetDeltaWad,
                submission.deltaToleranceWad,
                submission.chainsHash,
                submission.protocolsHash,
                submission.assetsHash
            )
        );
    }
}
