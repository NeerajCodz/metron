// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IIntentManager} from "../interfaces/IIntentManager.sol";
import {IAaveV3Adapter} from "../interfaces/IAaveV3Adapter.sol";
import {IRiskController} from "../interfaces/IRiskController.sol";
import {IVault} from "../interfaces/IVault.sol";
import {MetronTypes} from "../libraries/MetronTypes.sol";

contract LendingManager is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant AAVE_PROTOCOL_ID = keccak256("aave-v3");

    error InvalidAddress();
    error InvalidAmount();
    error InvalidIdentifier();
    error AssetNotApproved(address asset);
    error IntentNotAuthorized(bytes32 intentId, address asset);
    error InsufficientOutput(uint256 minimum, uint256 received);

    IIntentManager public immutable intentManager;
    IAaveV3Adapter public immutable adapter;
    IRiskController public immutable riskController;
    IVault public immutable vault;
    mapping(address asset => bool approved) public approvedAssets;

    event AssetApprovalConfigured(address indexed asset, bool approved);
    event Supplied(
        bytes32 indexed intentId, address indexed owner, address indexed asset, uint256 amount, bytes32 reservationId
    );
    event Withdrawn(
        bytes32 indexed intentId, address indexed owner, address indexed asset, uint256 amount, uint256 creditedAmount
    );
    event Borrowed(
        bytes32 indexed intentId,
        address indexed owner,
        address indexed asset,
        uint256 amount,
        uint256 creditedAmount,
        uint256 interestRateMode
    );
    event Repaid(
        bytes32 indexed intentId,
        address indexed owner,
        address indexed asset,
        uint256 requestedAmount,
        uint256 repaidAmount,
        bytes32 reservationId,
        uint256 interestRateMode
    );

    constructor(
        address admin,
        IIntentManager intentManager_,
        IAaveV3Adapter adapter_,
        IRiskController riskController_,
        IVault vault_
    ) {
        if (
            admin == address(0) || address(intentManager_) == address(0) || address(adapter_) == address(0)
                || address(riskController_) == address(0) || address(vault_) == address(0)
        ) revert InvalidAddress();
        intentManager = intentManager_;
        adapter = adapter_;
        riskController = riskController_;
        vault = vault_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    function configureAsset(address asset, bool approved) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (asset == address(0)) revert InvalidAddress();
        approvedAssets[asset] = approved;
        emit AssetApprovalConfigured(asset, approved);
    }

    function supply(
        bytes32 intentId,
        address asset,
        uint256 amount,
        bytes32 reservationId,
        MetronTypes.ExecutionConstraints calldata constraints
    ) external onlyRole(EXECUTOR_ROLE) whenNotPaused nonReentrant {
        MetronTypes.IntentAuthorization memory authorization = _authorize(intentId, asset, constraints);
        if (amount == 0 || reservationId == bytes32(0)) revert InvalidAmount();
        vault.consume(authorization.owner, asset, reservationId, amount, address(adapter));
        adapter.supply(asset, amount);
        emit Supplied(intentId, authorization.owner, asset, amount, reservationId);
    }

    function withdraw(
        bytes32 intentId,
        address asset,
        uint256 amount,
        uint256 minimumOutput,
        MetronTypes.ExecutionConstraints calldata constraints
    ) external onlyRole(EXECUTOR_ROLE) whenNotPaused nonReentrant returns (uint256 creditedAmount) {
        MetronTypes.IntentAuthorization memory authorization = _authorize(intentId, asset, constraints);
        if (amount == 0) revert InvalidAmount();
        uint256 withdrawn = adapter.withdraw(asset, amount, address(this));
        if (withdrawn == 0) revert InvalidAmount();
        creditedAmount = _deposit(authorization.owner, asset, withdrawn);
        if (creditedAmount < minimumOutput) revert InsufficientOutput(minimumOutput, creditedAmount);
        emit Withdrawn(intentId, authorization.owner, asset, withdrawn, creditedAmount);
    }

    function borrow(
        bytes32 intentId,
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        uint256 minimumOutput,
        MetronTypes.ExecutionConstraints calldata constraints
    ) external onlyRole(EXECUTOR_ROLE) whenNotPaused nonReentrant returns (uint256 creditedAmount) {
        MetronTypes.IntentAuthorization memory authorization = _authorize(intentId, asset, constraints);
        if (amount == 0) revert InvalidAmount();
        adapter.borrow(asset, amount, interestRateMode, address(this));
        creditedAmount = _deposit(authorization.owner, asset, amount);
        if (creditedAmount < minimumOutput) revert InsufficientOutput(minimumOutput, creditedAmount);
        emit Borrowed(intentId, authorization.owner, asset, amount, creditedAmount, interestRateMode);
    }

    function repay(
        bytes32 intentId,
        address asset,
        uint256 amount,
        bytes32 reservationId,
        uint256 interestRateMode,
        MetronTypes.ExecutionConstraints calldata constraints
    ) external onlyRole(EXECUTOR_ROLE) whenNotPaused nonReentrant returns (uint256 repaidAmount) {
        MetronTypes.IntentAuthorization memory authorization = _authorize(intentId, asset, constraints);
        if (amount == 0 || reservationId == bytes32(0)) revert InvalidAmount();
        vault.consume(authorization.owner, asset, reservationId, amount, address(adapter));
        repaidAmount = adapter.repay(asset, amount, interestRateMode);
        emit Repaid(intentId, authorization.owner, asset, amount, repaidAmount, reservationId, interestRateMode);
    }

    function accountData()
        external
        view
        returns (
            uint256 totalCollateralBase,
            uint256 totalDebtBase,
            uint256 availableBorrowsBase,
            uint256 currentLiquidationThreshold,
            uint256 ltv,
            uint256 healthFactor
        )
    {
        return adapter.accountData();
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _authorize(bytes32 intentId, address asset, MetronTypes.ExecutionConstraints calldata constraints)
        private
        view
        returns (MetronTypes.IntentAuthorization memory authorization)
    {
        if (!approvedAssets[asset]) revert AssetNotApproved(asset);
        authorization = intentManager.getIntent(intentId);
        if (
            !intentManager.isExecutionAuthorized(intentId, block.chainid, AAVE_PROTOCOL_ID, asset)
                || authorization.status != MetronTypes.IntentStatus.ACTIVE
        ) revert IntentNotAuthorized(intentId, asset);
        riskController.validateExecution(intentId, constraints);
    }

    function _deposit(address owner, address asset, uint256 amount) private returns (uint256 creditedAmount) {
        IERC20(asset).forceApprove(address(vault), amount);
        creditedAmount = vault.deposit(asset, amount, owner);
        IERC20(asset).forceApprove(address(vault), 0);
    }
}
