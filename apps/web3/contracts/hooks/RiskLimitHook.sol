// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IUniswapV4Hook} from "../interfaces/IUniswapV4Hook.sol";

contract RiskLimitHook is AccessControl, ReentrancyGuard, IUniswapV4Hook {
    bytes32 public constant CONFIG_ROLE = keccak256("CONFIG_ROLE");

    struct PoolPolicy {
        uint256 maxTradeAmount;
        uint32 cooldown;
        uint64 lastSwapAt;
        bool enabled;
    }

    error InvalidAddress();
    error InvalidPolicy();
    error UnauthorizedPoolManager(address caller);
    error UnauthorizedTrader(address trader);
    error PoolDisabled(bytes32 poolKeyHash);
    error TradeTooLarge(uint256 maximum, uint256 received);
    error CooldownActive(uint256 availableAt);
    error HookDataExpired(uint256 deadline);
    error InvalidHookData();

    address public immutable poolManager;
    mapping(bytes32 poolKeyHash => PoolPolicy policy) public poolPolicies;
    mapping(address trader => bool allowed) public approvedTraders;

    event PoolPolicyConfigured(bytes32 indexed poolKeyHash, uint256 maxTradeAmount, uint32 cooldown, bool enabled);
    event TraderConfigured(address indexed trader, bool allowed);
    event SwapGuarded(
        bytes32 indexed poolKeyHash, address indexed sender, uint256 amount, uint256 deadline, bytes32 traceId
    );

    constructor(address admin, address poolManager_) {
        if (admin == address(0) || poolManager_ == address(0)) revert InvalidAddress();
        poolManager = poolManager_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(CONFIG_ROLE, admin);
    }

    function configurePool(bytes32 poolKeyHash, uint256 maxTradeAmount, uint32 cooldown, bool enabled)
        external
        onlyRole(CONFIG_ROLE)
    {
        if (poolKeyHash == bytes32(0) || maxTradeAmount == 0) revert InvalidPolicy();
        poolPolicies[poolKeyHash] =
            PoolPolicy({maxTradeAmount: maxTradeAmount, cooldown: cooldown, lastSwapAt: 0, enabled: enabled});
        emit PoolPolicyConfigured(poolKeyHash, maxTradeAmount, cooldown, enabled);
    }

    function configureTrader(address trader, bool allowed) external onlyRole(CONFIG_ROLE) {
        if (trader == address(0)) revert InvalidAddress();
        approvedTraders[trader] = allowed;
        emit TraderConfigured(trader, allowed);
    }

    function beforeSwap(address sender, PoolKey calldata key, SwapParams calldata params, bytes calldata hookData)
        external
        nonReentrant
        returns (bytes4 selector, int256 beforeSwapDelta, uint24 lpFeeOverride)
    {
        if (msg.sender != poolManager) revert UnauthorizedPoolManager(msg.sender);
        if (!approvedTraders[sender]) revert UnauthorizedTrader(sender);
        bytes32 poolKeyHash = _hashPoolKey(key);
        PoolPolicy storage policy = poolPolicies[poolKeyHash];
        if (!policy.enabled) revert PoolDisabled(poolKeyHash);
        if (params.amountSpecified >= 0 || params.amountSpecified == type(int256).min) revert InvalidHookData();
        uint256 amount = uint256(-params.amountSpecified);
        if (amount > policy.maxTradeAmount) revert TradeTooLarge(policy.maxTradeAmount, amount);
        if (policy.lastSwapAt != 0 && block.timestamp < uint256(policy.lastSwapAt) + policy.cooldown) {
            revert CooldownActive(uint256(policy.lastSwapAt) + policy.cooldown);
        }
        (uint256 requestedAmount, uint256 deadline, bytes32 traceId) = abi.decode(hookData, (uint256, uint256, bytes32));
        if (requestedAmount != amount || traceId == bytes32(0)) revert InvalidHookData();
        if (block.timestamp > deadline) revert HookDataExpired(deadline);
        policy.lastSwapAt = uint64(block.timestamp);
        emit SwapGuarded(poolKeyHash, sender, amount, deadline, traceId);
        return (IUniswapV4Hook.beforeSwap.selector, 0, 0);
    }

    function afterSwap(
        address sender,
        PoolKey calldata key,
        SwapParams calldata params,
        int256 delta,
        bytes calldata hookData
    ) external returns (bytes4 selector, int256 hookDelta) {
        if (msg.sender != poolManager) revert UnauthorizedPoolManager(msg.sender);
        bytes32 traceId;
        if (hookData.length == 96) {
            (,, traceId) = abi.decode(hookData, (uint256, uint256, bytes32));
        }
        emit SwapGuarded(
            _hashPoolKey(key), sender, params.amountSpecified < 0 ? uint256(-params.amountSpecified) : 0, 0, traceId
        );
        delta;
        return (IUniswapV4Hook.afterSwap.selector, 0);
    }

    function _hashPoolKey(PoolKey calldata key) private pure returns (bytes32) {
        return keccak256(abi.encode(key.currency0, key.currency1, key.fee, key.tickSpacing, key.hooks));
    }
}
