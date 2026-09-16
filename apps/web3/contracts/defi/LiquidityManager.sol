// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IIntentManager} from "../interfaces/IIntentManager.sol";
import {IRiskController} from "../interfaces/IRiskController.sol";
import {IUniswapV4Adapter} from "../interfaces/IUniswapV4Adapter.sol";
import {IUniswapV4PoolManager} from "../interfaces/IUniswapV4PoolManager.sol";
import {IVault} from "../interfaces/IVault.sol";
import {MetronTypes} from "../libraries/MetronTypes.sol";

contract LiquidityManager is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UNISWAP_PROTOCOL_ID = keccak256("uniswap-v4");

    struct LiquidityPosition {
        address owner;
        bytes32 intentId;
        bytes32 poolKeyHash;
        int24 tickLower;
        int24 tickUpper;
        int256 liquidity;
        uint64 updatedAt;
        bool active;
    }

    error InvalidAddress();
    error InvalidAmount();
    error InvalidPoolKey();
    error AssetNotApproved(address asset);
    error IntentNotAuthorized(bytes32 intentId, address asset);
    error PositionAlreadyExists(bytes32 positionId);
    error PositionNotFound(bytes32 positionId);
    error PositionInactive(bytes32 positionId);
    error InvalidLiquidityDelta();
    error InvalidDelta(int256 amount0, int256 amount1);
    error InsufficientOutput(uint256 minimum, uint256 received);

    IIntentManager public immutable intentManager;
    IUniswapV4Adapter public immutable adapter;
    IRiskController public immutable riskController;
    IVault public immutable vault;
    mapping(address asset => bool approved) public approvedAssets;
    mapping(bytes32 positionId => LiquidityPosition position) private positions;
    mapping(bytes32 positionId => IUniswapV4PoolManager.PoolKey poolKey) private poolKeys;

    event AssetApprovalConfigured(address indexed asset, bool approved);
    event LiquidityPositionOpened(
        bytes32 indexed positionId,
        bytes32 indexed intentId,
        address indexed owner,
        bytes32 poolKeyHash,
        int24 tickLower,
        int24 tickUpper,
        int256 liquidity
    );
    event LiquidityPositionClosed(bytes32 indexed positionId, uint256 output0, uint256 output1);
    event LiquidityModified(bytes32 indexed positionId, int256 callerDelta, int256 feesAccrued, bytes32 intentId);

    constructor(
        address admin,
        IIntentManager intentManager_,
        IUniswapV4Adapter adapter_,
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

    function addLiquidity(
        bytes32 intentId,
        IUniswapV4PoolManager.PoolKey calldata key,
        int24 tickLower,
        int24 tickUpper,
        int256 liquidityDelta,
        bytes32 salt,
        bytes32 reservationId0,
        uint256 amount0,
        bytes32 reservationId1,
        uint256 amount1,
        MetronTypes.ExecutionConstraints calldata constraints,
        bytes calldata hookData
    ) external onlyRole(EXECUTOR_ROLE) whenNotPaused nonReentrant returns (bytes32 positionId) {
        _authorize(intentId, key, constraints);
        if (
            tickLower >= tickUpper || liquidityDelta <= 0 || salt == bytes32(0) || reservationId0 == bytes32(0)
                || reservationId1 == bytes32(0) || amount0 == 0 || amount1 == 0
        ) revert InvalidAmount();
        MetronTypes.IntentAuthorization memory authorization = intentManager.getIntent(intentId);
        bytes32 poolKeyHash = _hashPoolKey(key);
        positionId = keccak256(abi.encode(intentId, poolKeyHash, tickLower, tickUpper, salt));
        if (positions[positionId].active) revert PositionAlreadyExists(positionId);

        vault.consume(authorization.owner, key.currency0, reservationId0, amount0, address(adapter));
        vault.consume(authorization.owner, key.currency1, reservationId1, amount1, address(adapter));
        (int256 callerDelta, int256 feesAccrued) =
            adapter.modifyLiquidity(key, tickLower, tickUpper, liquidityDelta, salt, hookData);
        _settlePositionDelta(authorization.owner, key, callerDelta, amount0, amount1, 0, 0);

        positions[positionId] = LiquidityPosition({
            owner: authorization.owner,
            intentId: intentId,
            poolKeyHash: poolKeyHash,
            tickLower: tickLower,
            tickUpper: tickUpper,
            liquidity: liquidityDelta,
            updatedAt: uint64(block.timestamp),
            active: true
        });
        poolKeys[positionId] = key;
        emit LiquidityPositionOpened(
            positionId, intentId, authorization.owner, poolKeyHash, tickLower, tickUpper, liquidityDelta
        );
        emit LiquidityModified(positionId, callerDelta, feesAccrued, intentId);
    }

    function closeLiquidity(bytes32 positionId, uint256 minimumOutput0, uint256 minimumOutput1, bytes calldata hookData)
        external
        onlyRole(EXECUTOR_ROLE)
        whenNotPaused
        nonReentrant
        returns (uint256 output0, uint256 output1)
    {
        LiquidityPosition storage position = positions[positionId];
        if (!position.active) revert PositionNotFound(positionId);
        IUniswapV4PoolManager.PoolKey memory key = poolKeys[positionId];
        (int256 callerDelta, int256 feesAccrued) = _removeLiquidity(key, position, hookData);
        (output0, output1) = _settleClosedPosition(position, key, callerDelta, minimumOutput0, minimumOutput1);
        position.active = false;
        position.liquidity = 0;
        position.updatedAt = uint64(block.timestamp);
        emit LiquidityPositionClosed(positionId, output0, output1);
        emit LiquidityModified(positionId, callerDelta, feesAccrued, position.intentId);
    }

    function getPosition(bytes32 positionId) external view returns (LiquidityPosition memory) {
        return positions[positionId];
    }

    function getPoolKey(bytes32 positionId) external view returns (IUniswapV4PoolManager.PoolKey memory) {
        return poolKeys[positionId];
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _authorize(
        bytes32 intentId,
        IUniswapV4PoolManager.PoolKey calldata key,
        MetronTypes.ExecutionConstraints calldata constraints
    ) private view {
        if (key.currency0 == address(0) || key.currency1 == address(0) || key.currency0 >= key.currency1) {
            revert InvalidPoolKey();
        }
        if (!approvedAssets[key.currency0]) revert AssetNotApproved(key.currency0);
        if (!approvedAssets[key.currency1]) revert AssetNotApproved(key.currency1);
        if (!intentManager.isExecutionAuthorized(intentId, block.chainid, UNISWAP_PROTOCOL_ID, key.currency0)) {
            revert IntentNotAuthorized(intentId, key.currency0);
        }
        if (!intentManager.isExecutionAuthorized(intentId, block.chainid, UNISWAP_PROTOCOL_ID, key.currency1)) {
            revert IntentNotAuthorized(intentId, key.currency1);
        }
        riskController.validateExecution(intentId, constraints);
    }

    function _settlePositionDelta(
        address owner,
        IUniswapV4PoolManager.PoolKey memory key,
        int256 callerDelta,
        uint256 provided0,
        uint256 provided1,
        uint256 minimum0,
        uint256 minimum1
    ) private returns (uint256 output0, uint256 output1) {
        int256 delta0 = int256(int128(callerDelta >> 128));
        int256 delta1 = int256(int128(callerDelta));
        if (delta0 < 0 && uint256(-delta0) > provided0) revert InvalidDelta(delta0, delta1);
        if (delta1 < 0 && uint256(-delta1) > provided1) revert InvalidDelta(delta0, delta1);

        if (delta0 < 0 && provided0 > uint256(-delta0)) {
            _returnAsset(owner, key.currency0, provided0 - uint256(-delta0));
        } else if (delta0 > 0) {
            output0 = _returnAsset(owner, key.currency0, uint256(delta0));
            if (output0 < minimum0) revert InsufficientOutput(minimum0, output0);
        }
        if (delta1 < 0 && provided1 > uint256(-delta1)) {
            _returnAsset(owner, key.currency1, provided1 - uint256(-delta1));
        } else if (delta1 > 0) {
            output1 = _returnAsset(owner, key.currency1, uint256(delta1));
            if (output1 < minimum1) revert InsufficientOutput(minimum1, output1);
        }
    }

    function _returnAsset(address owner, address asset, uint256 amount) private returns (uint256 creditedAmount) {
        if (amount == 0) return 0;
        adapter.transferAsset(asset, address(this), amount);
        IERC20(asset).forceApprove(address(vault), amount);
        creditedAmount = vault.deposit(asset, amount, owner);
        IERC20(asset).forceApprove(address(vault), 0);
    }

    function _removeLiquidity(
        IUniswapV4PoolManager.PoolKey memory key,
        LiquidityPosition storage position,
        bytes calldata hookData
    ) private returns (int256 callerDelta, int256 feesAccrued) {
        return adapter.modifyLiquidity(
            key, position.tickLower, position.tickUpper, -position.liquidity, position.poolKeyHash, hookData
        );
    }

    function _hashPoolKey(IUniswapV4PoolManager.PoolKey calldata key) private pure returns (bytes32) {
        return keccak256(abi.encode(key.currency0, key.currency1, key.fee, key.tickSpacing, key.hooks));
    }

    function _settleClosedPosition(
        LiquidityPosition storage position,
        IUniswapV4PoolManager.PoolKey memory key,
        int256 callerDelta,
        uint256 minimumOutput0,
        uint256 minimumOutput1
    ) private returns (uint256 output0, uint256 output1) {
        return _settlePositionDelta(position.owner, key, callerDelta, 0, 0, minimumOutput0, minimumOutput1);
    }
}
