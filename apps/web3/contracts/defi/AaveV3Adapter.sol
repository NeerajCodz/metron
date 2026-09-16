// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IAaveV3Adapter} from "../interfaces/IAaveV3Adapter.sol";
import {IAaveV3Pool} from "../interfaces/IAaveV3Pool.sol";

contract AaveV3Adapter is AccessControl, IAaveV3Adapter {
    using SafeERC20 for IERC20;

    bytes32 public constant CALLER_ROLE = keccak256("CALLER_ROLE");

    error InvalidAddress();
    error InvalidAmount();
    error InvalidReceiver();
    error FlashLoanReceiverNotConfigured();

    IAaveV3Pool public immutable pool;
    address public flashLoanReceiver;

    event FlashLoanReceiverConfigured(address indexed receiver);
    event Supplied(address indexed asset, uint256 amount);
    event Withdrawn(address indexed asset, uint256 amount, address indexed recipient);
    event Borrowed(address indexed asset, uint256 amount, uint256 interestRateMode, address indexed recipient);
    event Repaid(address indexed asset, uint256 amount, uint256 interestRateMode);
    event FlashLoanStarted(address indexed asset, uint256 amount, bytes32 paramsHash);

    constructor(address admin, IAaveV3Pool pool_) {
        if (admin == address(0) || address(pool_) == address(0)) revert InvalidAddress();
        pool = pool_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function configureFlashLoanReceiver(address receiver) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (receiver == address(0)) revert InvalidReceiver();
        flashLoanReceiver = receiver;
        emit FlashLoanReceiverConfigured(receiver);
    }

    function supply(address asset, uint256 amount) external onlyRole(CALLER_ROLE) {
        if (asset == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        IERC20(asset).forceApprove(address(pool), amount);
        pool.supply(asset, amount, address(this), 0);
        IERC20(asset).forceApprove(address(pool), 0);
        emit Supplied(asset, amount);
    }

    function withdraw(address asset, uint256 amount, address recipient)
        external
        onlyRole(CALLER_ROLE)
        returns (uint256 withdrawn)
    {
        if (asset == address(0) || recipient == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        withdrawn = pool.withdraw(asset, amount, address(this));
        IERC20(asset).safeTransfer(recipient, withdrawn);
        emit Withdrawn(asset, withdrawn, recipient);
    }

    function borrow(address asset, uint256 amount, uint256 interestRateMode, address recipient)
        external
        onlyRole(CALLER_ROLE)
    {
        if (asset == address(0) || recipient == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        pool.borrow(asset, amount, interestRateMode, 0, address(this));
        IERC20(asset).safeTransfer(recipient, amount);
        emit Borrowed(asset, amount, interestRateMode, recipient);
    }

    function repay(address asset, uint256 amount, uint256 interestRateMode)
        external
        onlyRole(CALLER_ROLE)
        returns (uint256 repaid)
    {
        if (asset == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        IERC20(asset).forceApprove(address(pool), amount);
        repaid = pool.repay(asset, amount, interestRateMode, address(this));
        IERC20(asset).forceApprove(address(pool), 0);
        if (repaid < amount) IERC20(asset).safeTransfer(msg.sender, amount - repaid);
        emit Repaid(asset, repaid, interestRateMode);
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
        return pool.getUserAccountData(address(this));
    }

    function flashLoanSimple(address asset, uint256 amount, bytes calldata params) external onlyRole(CALLER_ROLE) {
        if (asset == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        address receiver = flashLoanReceiver;
        if (receiver == address(0)) revert FlashLoanReceiverNotConfigured();
        pool.flashLoanSimple(receiver, asset, amount, params, 0);
        emit FlashLoanStarted(asset, amount, keccak256(params));
    }
}
