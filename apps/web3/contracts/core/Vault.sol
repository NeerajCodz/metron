// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Vault is AccessControl, EIP712, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant RESERVATION_TYPEHASH = keccak256(
        "ReservationRequest(address owner,address asset,uint256 amount,bytes32 authorizationId,uint256 nonce,uint256 deadline)"
    );

    struct ReservationRequest {
        address owner;
        address asset;
        uint256 amount;
        bytes32 authorizationId;
        uint256 nonce;
        uint256 deadline;
    }

    error InvalidAddress();
    error InvalidAmount();
    error AuthorizationExpired(uint256 deadline);
    error InvalidNonce(uint256 expected, uint256 received);
    error InvalidSigner(address expected, address recovered);
    error InsufficientAvailableBalance(uint256 available, uint256 required);
    error InsufficientReservedBalance(uint256 reserved, uint256 required);
    error ReservationAlreadyExists(bytes32 authorizationId);
    error UnauthorizedRelease(address caller);
    error InsufficientExcess(uint256 excess, uint256 required);

    mapping(address owner => mapping(address asset => uint256 amount)) private availableBalances;
    mapping(address owner => mapping(address asset => mapping(bytes32 authorizationId => uint256 amount))) private
        reservations;
    mapping(address owner => uint256 nonce) public nonces;
    mapping(address asset => uint256 amount) public totalLiability;

    event Deposited(
        address indexed caller,
        address indexed owner,
        address indexed asset,
        uint256 requestedAmount,
        uint256 creditedAmount
    );
    event Withdrawn(address indexed owner, address indexed asset, address indexed recipient, uint256 amount);
    event Reserved(address indexed owner, address indexed asset, bytes32 indexed authorizationId, uint256 amount);
    event ReservationReleased(
        address indexed owner, address indexed asset, bytes32 indexed authorizationId, uint256 amount
    );
    event ReservationConsumed(
        address indexed owner, address indexed asset, bytes32 indexed authorizationId, address recipient, uint256 amount
    );
    event ExcessRescued(address indexed asset, address indexed recipient, uint256 amount);

    constructor(address admin) EIP712("Metron Vault", "1") {
        if (admin == address(0)) revert InvalidAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    function deposit(address asset, uint256 amount, address owner)
        external
        nonReentrant
        whenNotPaused
        returns (uint256 creditedAmount)
    {
        if (asset == address(0) || owner == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();

        IERC20 token = IERC20(asset);
        uint256 balanceBefore = token.balanceOf(address(this));
        token.safeTransferFrom(msg.sender, address(this), amount);
        creditedAmount = token.balanceOf(address(this)) - balanceBefore;
        if (creditedAmount == 0) revert InvalidAmount();

        availableBalances[owner][asset] += creditedAmount;
        totalLiability[asset] += creditedAmount;
        emit Deposited(msg.sender, owner, asset, amount, creditedAmount);
    }

    function withdraw(address asset, uint256 amount, address recipient) external nonReentrant {
        if (asset == address(0) || recipient == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();

        uint256 available = availableBalances[msg.sender][asset];
        if (amount > available) revert InsufficientAvailableBalance(available, amount);

        availableBalances[msg.sender][asset] = available - amount;
        totalLiability[asset] -= amount;
        IERC20(asset).safeTransfer(recipient, amount);
        emit Withdrawn(msg.sender, asset, recipient, amount);
    }

    function reserveSelf(address asset, uint256 amount, bytes32 authorizationId) external whenNotPaused {
        _reserve(msg.sender, asset, amount, authorizationId);
    }

    function reserveWithSignature(ReservationRequest calldata request, bytes calldata signature)
        external
        onlyRole(EXECUTOR_ROLE)
        whenNotPaused
    {
        if (block.timestamp > request.deadline) revert AuthorizationExpired(request.deadline);
        uint256 expectedNonce = nonces[request.owner];
        if (request.nonce != expectedNonce) revert InvalidNonce(expectedNonce, request.nonce);

        bytes32 digest = _hashTypedDataV4(_hashReservationRequest(request));
        address recovered = ECDSA.recover(digest, signature);
        if (recovered != request.owner) revert InvalidSigner(request.owner, recovered);

        nonces[request.owner] = expectedNonce + 1;
        _reserve(request.owner, request.asset, request.amount, request.authorizationId);
    }

    function release(address owner, address asset, bytes32 authorizationId) external {
        if (msg.sender != owner && !hasRole(EXECUTOR_ROLE, msg.sender)) {
            revert UnauthorizedRelease(msg.sender);
        }
        uint256 reserved = reservations[owner][asset][authorizationId];
        if (reserved == 0) revert InsufficientReservedBalance(0, 1);

        delete reservations[owner][asset][authorizationId];
        availableBalances[owner][asset] += reserved;
        emit ReservationReleased(owner, asset, authorizationId, reserved);
    }

    function consume(address owner, address asset, bytes32 authorizationId, uint256 amount, address recipient)
        external
        onlyRole(EXECUTOR_ROLE)
        nonReentrant
        whenNotPaused
    {
        if (recipient == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();

        uint256 reserved = reservations[owner][asset][authorizationId];
        if (amount > reserved) revert InsufficientReservedBalance(reserved, amount);

        uint256 remaining = reserved - amount;
        if (remaining == 0) {
            delete reservations[owner][asset][authorizationId];
        } else {
            reservations[owner][asset][authorizationId] = remaining;
        }
        totalLiability[asset] -= amount;
        IERC20(asset).safeTransfer(recipient, amount);
        emit ReservationConsumed(owner, asset, authorizationId, recipient, amount);
    }

    function rescueExcess(address asset, uint256 amount, address recipient)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        nonReentrant
    {
        if (asset == address(0) || recipient == address(0)) revert InvalidAddress();
        uint256 currentBalance = IERC20(asset).balanceOf(address(this));
        uint256 liability = totalLiability[asset];
        uint256 excess = currentBalance > liability ? currentBalance - liability : 0;
        if (amount > excess) revert InsufficientExcess(excess, amount);
        IERC20(asset).safeTransfer(recipient, amount);
        emit ExcessRescued(asset, recipient, amount);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function availableBalance(address owner, address asset) external view returns (uint256) {
        return availableBalances[owner][asset];
    }

    function reservedBalance(address owner, address asset, bytes32 authorizationId) external view returns (uint256) {
        return reservations[owner][asset][authorizationId];
    }

    function hashReservationRequest(ReservationRequest calldata request) external view returns (bytes32) {
        return _hashTypedDataV4(_hashReservationRequest(request));
    }

    function _reserve(address owner, address asset, uint256 amount, bytes32 authorizationId) private {
        if (owner == address(0) || asset == address(0) || authorizationId == bytes32(0)) {
            revert InvalidAddress();
        }
        if (amount == 0) revert InvalidAmount();
        if (reservations[owner][asset][authorizationId] != 0) {
            revert ReservationAlreadyExists(authorizationId);
        }

        uint256 available = availableBalances[owner][asset];
        if (amount > available) revert InsufficientAvailableBalance(available, amount);
        availableBalances[owner][asset] = available - amount;
        reservations[owner][asset][authorizationId] = amount;
        emit Reserved(owner, asset, authorizationId, amount);
    }

    function _hashReservationRequest(ReservationRequest calldata request) private pure returns (bytes32) {
        return keccak256(
            abi.encode(
                RESERVATION_TYPEHASH,
                request.owner,
                request.asset,
                request.amount,
                request.authorizationId,
                request.nonce,
                request.deadline
            )
        );
    }
}
