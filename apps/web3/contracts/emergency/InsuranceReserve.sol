// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract InsuranceReserve is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant CLAIM_ROLE = keccak256("CLAIM_ROLE");
    bytes32 public constant CONFIG_ROLE = keccak256("CONFIG_ROLE");

    enum TriggerKind {
        PRICE_LOSS,
        ORACLE_DIVERGENCE,
        MESSAGE_FAILURE,
        PROTOCOL_INCIDENT
    }

    struct Coverage {
        address beneficiary;
        uint256 cap;
        uint256 paid;
        uint64 expiresAt;
        bool enabled;
    }

    error InvalidAddress();
    error InvalidAmount();
    error InvalidCoverage();
    error TriggerNotVerified(bytes32 evidenceHash);
    error TriggerMismatch(TriggerKind expected, TriggerKind received);
    error CoverageUnavailable(uint256 requested, uint256 available);
    error ClaimAlreadyProcessed(bytes32 claimId);
    error ClaimExpired(uint256 expiry);

    IERC20 public immutable asset;
    uint256 public immutable reserveCap;
    mapping(bytes32 coverageId => Coverage coverage) public coverages;
    mapping(bytes32 evidenceHash => bool verified) public verifiedEvidence;
    mapping(bytes32 evidenceHash => TriggerKind trigger) public evidenceTriggers;
    mapping(bytes32 evidenceHash => bool configuredEvidence) public configuredEvidence;
    mapping(bytes32 claimId => bool processed) public processedClaims;

    event ReserveFunded(address indexed funder, uint256 amount);
    event CoverageConfigured(bytes32 indexed coverageId, address indexed beneficiary, uint256 cap, uint64 expiresAt);
    event EvidenceConfigured(bytes32 indexed evidenceHash, TriggerKind indexed trigger, bool verified);
    event ClaimPaid(bytes32 indexed claimId, bytes32 indexed coverageId, address indexed beneficiary, uint256 amount, TriggerKind trigger);

    constructor(address admin, IERC20 asset_, uint256 reserveCap_) {
        if (admin == address(0) || address(asset_) == address(0) || reserveCap_ == 0) revert InvalidAddress();
        asset = asset_;
        reserveCap = reserveCap_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(CONFIG_ROLE, admin);
        _grantRole(CLAIM_ROLE, admin);
    }

    function fund(uint256 amount) external whenNotPaused nonReentrant {
        if (amount == 0 || asset.balanceOf(address(this)) + amount > reserveCap) revert InvalidAmount();
        asset.safeTransferFrom(msg.sender, address(this), amount);
        emit ReserveFunded(msg.sender, amount);
    }

    function configureCoverage(bytes32 coverageId, address beneficiary, uint256 cap, uint64 expiresAt)
        external
        onlyRole(CONFIG_ROLE)
    {
        if (coverageId == bytes32(0) || beneficiary == address(0) || cap == 0 || expiresAt <= block.timestamp) {
            revert InvalidCoverage();
        }
        coverages[coverageId] = Coverage(beneficiary, cap, 0, expiresAt, true);
        emit CoverageConfigured(coverageId, beneficiary, cap, expiresAt);
    }

    function configureEvidence(bytes32 evidenceHash, TriggerKind trigger, bool verified) external onlyRole(CONFIG_ROLE) {
        if (evidenceHash == bytes32(0)) revert InvalidCoverage();
        verifiedEvidence[evidenceHash] = verified;
        evidenceTriggers[evidenceHash] = trigger;
        configuredEvidence[evidenceHash] = true;
        emit EvidenceConfigured(evidenceHash, trigger, verified);
    }

    function claim(
        bytes32 coverageId,
        uint256 amount,
        TriggerKind trigger,
        bytes32 evidenceHash,
        bytes32 claimNonce
    ) external onlyRole(CLAIM_ROLE) whenNotPaused nonReentrant returns (bytes32 claimId) {
        Coverage storage coverage = coverages[coverageId];
        if (!coverage.enabled || block.timestamp > coverage.expiresAt) revert ClaimExpired(coverage.expiresAt);
        if (amount == 0 || evidenceHash == bytes32(0) || claimNonce == bytes32(0)) revert InvalidAmount();
        if (!verifiedEvidence[evidenceHash]) revert TriggerNotVerified(evidenceHash);
        if (!configuredEvidence[evidenceHash] || evidenceTriggers[evidenceHash] != trigger) {
            revert TriggerMismatch(evidenceTriggers[evidenceHash], trigger);
        }
        uint256 remainingCoverage = coverage.cap - coverage.paid;
        uint256 available = asset.balanceOf(address(this));
        if (amount > remainingCoverage || amount > available) revert CoverageUnavailable(amount, remainingCoverage < available ? remainingCoverage : available);
        claimId = keccak256(abi.encode(address(this), coverageId, amount, trigger, evidenceHash, claimNonce));
        if (processedClaims[claimId]) revert ClaimAlreadyProcessed(claimId);
        processedClaims[claimId] = true;
        coverage.paid += amount;
        asset.safeTransfer(coverage.beneficiary, amount);
        emit ClaimPaid(claimId, coverageId, coverage.beneficiary, amount, trigger);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
