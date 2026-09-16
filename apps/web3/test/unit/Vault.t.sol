// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Test} from "forge-std/Test.sol";
import {Vault} from "../../contracts/core/Vault.sol";

contract MockToken is ERC20 {
    constructor() ERC20("Mock USD", "mUSD") {}

    function mint(address recipient, uint256 amount) external {
        _mint(recipient, amount);
    }
}

contract FeeToken is ERC20 {
    constructor() ERC20("Fee Token", "FEE") {}

    function mint(address recipient, uint256 amount) external {
        _mint(recipient, amount);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from == address(0) || to == address(0)) {
            super._update(from, to, value);
            return;
        }
        uint256 fee = value / 100;
        super._update(from, to, value - fee);
        super._update(from, address(0), fee);
    }
}

contract VaultTest is Test {
    uint256 private constant USER_PRIVATE_KEY = 0xA11CE;
    bytes32 private constant AUTHORIZATION_ID = keccak256("intent-1:deposit");

    address private admin = makeAddr("admin");
    address private executor = makeAddr("executor");
    address private user;
    address private recipient = makeAddr("recipient");

    Vault private vault;
    MockToken private token;
    bytes32 private executorRole;

    function setUp() public {
        user = vm.addr(USER_PRIVATE_KEY);
        vault = new Vault(admin);
        token = new MockToken();
        executorRole = vault.EXECUTOR_ROLE();

        vm.prank(admin);
        vault.grantRole(executorRole, executor);

        token.mint(user, 1_000e18);
        vm.startPrank(user);
        token.approve(address(vault), type(uint256).max);
        vault.deposit(address(token), 1_000e18, user);
        vm.stopPrank();
    }

    function test_DepositAndWithdrawalPreserveLiability() public {
        assertEq(vault.availableBalance(user, address(token)), 1_000e18);
        assertEq(vault.totalLiability(address(token)), 1_000e18);

        vm.prank(user);
        vault.withdraw(address(token), 250e18, recipient);

        assertEq(token.balanceOf(recipient), 250e18);
        assertEq(vault.availableBalance(user, address(token)), 750e18);
        assertEq(vault.totalLiability(address(token)), 750e18);
        assertEq(token.balanceOf(address(vault)), 750e18);
    }

    function test_DepositCreditsActualFeeOnTransferAmount() public {
        FeeToken feeToken = new FeeToken();
        feeToken.mint(user, 100e18);

        vm.startPrank(user);
        feeToken.approve(address(vault), 100e18);
        uint256 credited = vault.deposit(address(feeToken), 100e18, user);
        vm.stopPrank();

        assertEq(credited, 99e18);
        assertEq(vault.availableBalance(user, address(feeToken)), 99e18);
        assertEq(vault.totalLiability(address(feeToken)), feeToken.balanceOf(address(vault)));
    }

    function test_ExecutorReservesOnlyWithUserSignature() public {
        Vault.ReservationRequest memory request = _reservationRequest(400e18);
        bytes memory signature = _sign(request);

        vm.prank(executor);
        vault.reserveWithSignature(request, signature);

        assertEq(vault.availableBalance(user, address(token)), 600e18);
        assertEq(vault.reservedBalance(user, address(token), AUTHORIZATION_ID), 400e18);
        assertEq(vault.nonces(user), 1);
    }

    function test_SignedReservationCannotBeReplayed() public {
        Vault.ReservationRequest memory request = _reservationRequest(400e18);
        bytes memory signature = _sign(request);

        vm.startPrank(executor);
        vault.reserveWithSignature(request, signature);
        vm.expectRevert(abi.encodeWithSelector(Vault.InvalidNonce.selector, 1, 0));
        vault.reserveWithSignature(request, signature);
        vm.stopPrank();
    }

    function test_ExecutorConsumesOnlyReservedFunds() public {
        Vault.ReservationRequest memory request = _reservationRequest(400e18);

        vm.startPrank(executor);
        vault.reserveWithSignature(request, _sign(request));
        vault.consume(user, address(token), AUTHORIZATION_ID, 150e18, recipient);
        vm.stopPrank();

        assertEq(token.balanceOf(recipient), 150e18);
        assertEq(vault.reservedBalance(user, address(token), AUTHORIZATION_ID), 250e18);
        assertEq(vault.totalLiability(address(token)), 850e18);
    }

    function test_UserCanReleaseReservationWhilePaused() public {
        vm.prank(user);
        vault.reserveSelf(address(token), 400e18, AUTHORIZATION_ID);

        vm.prank(admin);
        vault.pause();

        vm.prank(user);
        vault.release(user, address(token), AUTHORIZATION_ID);
        assertEq(vault.availableBalance(user, address(token)), 1_000e18);

        vm.prank(user);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        vault.deposit(address(token), 1, user);
    }

    function test_AdminCanRescueOnlyExcessTokens() public {
        token.mint(address(vault), 10e18);

        vm.prank(admin);
        vault.rescueExcess(address(token), 10e18, recipient);
        assertEq(token.balanceOf(recipient), 10e18);

        vm.prank(admin);
        vm.expectRevert(abi.encodeWithSelector(Vault.InsufficientExcess.selector, 0, 1));
        vault.rescueExcess(address(token), 1, recipient);
    }

    function test_NonExecutorCannotConsumeReservation() public {
        vm.prank(user);
        vault.reserveSelf(address(token), 100e18, AUTHORIZATION_ID);

        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, user, executorRole)
        );
        vault.consume(user, address(token), AUTHORIZATION_ID, 100e18, recipient);
    }

    function _reservationRequest(uint256 amount) private view returns (Vault.ReservationRequest memory) {
        return Vault.ReservationRequest({
            owner: user,
            asset: address(token),
            amount: amount,
            authorizationId: AUTHORIZATION_ID,
            nonce: vault.nonces(user),
            deadline: block.timestamp + 1 hours
        });
    }

    function _sign(Vault.ReservationRequest memory request) private view returns (bytes memory) {
        bytes32 digest = vault.hashReservationRequest(request);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(USER_PRIVATE_KEY, digest);
        return abi.encodePacked(r, s, v);
    }
}
