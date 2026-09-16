// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {CrossChainRouter} from "../../contracts/crosschain/CrossChainRouter.sol";
import {LayerZeroAdapter} from "../../contracts/crosschain/LayerZeroAdapter.sol";
import {RemoteExecutor} from "../../contracts/crosschain/RemoteExecutor.sol";
import {ILayerZeroAdapter} from "../../contracts/interfaces/ILayerZeroAdapter.sol";
import {
    ILayerZeroEndpointV2,
    LzMessagingParams,
    LzMessagingReceipt,
    LzOrigin
} from "../../contracts/interfaces/ILayerZeroEndpointV2.sol";

contract MockLayerZeroEndpoint is ILayerZeroEndpointV2 {
    uint64 public nonce;
    bytes32 public nextGuid = keccak256("guid-1");
    LzMessagingParams public lastParams;

    function quote(LzMessagingParams calldata, address) external pure returns (uint256, uint256) {
        return (1, 0);
    }

    function send(LzMessagingParams calldata params, address)
        external
        payable
        returns (LzMessagingReceipt memory receipt)
    {
        lastParams = params;
        receipt = LzMessagingReceipt(nextGuid, ++nonce, 1, 0);
        nextGuid = keccak256(abi.encode(nextGuid));
    }

    function deliver(address receiver, LzOrigin calldata origin, bytes32 guid, bytes calldata message) external {
        (bool ok, bytes memory reason) =
            receiver.call(abi.encodeCall(LayerZeroAdapter.lzReceive, (origin, receiver, guid, message, bytes(""))));
        if (!ok) {
            assembly {
                revert(add(reason, 32), mload(reason))
            }
        }
    }
}

contract MockRemoteTarget {
    uint256 public calls;

    function execute() external {
        ++calls;
    }
}

contract LayerZeroAdapterTest is Test {
    address internal admin = address(0xA11CE);
    uint32 internal constant REMOTE_EID = 40231;
    bytes32 internal constant REMOTE_PEER = bytes32(uint256(uint160(address(0xBEEF))));
    address internal dispatcher = address(0xD15C);
    MockLayerZeroEndpoint internal endpoint;
    LayerZeroAdapter internal adapter;
    RemoteExecutor internal remoteExecutor;
    CrossChainRouter internal router;
    MockRemoteTarget internal target;

    function setUp() external {
        endpoint = new MockLayerZeroEndpoint();
        adapter = new LayerZeroAdapter(admin, endpoint);
        remoteExecutor = new RemoteExecutor(admin, address(adapter));
        router = new CrossChainRouter(admin, ILayerZeroAdapter(address(adapter)));
        target = new MockRemoteTarget();
        vm.startPrank(admin);
        adapter.setPeer(REMOTE_EID, REMOTE_PEER);
        adapter.setRemoteExecutor(remoteExecutor);
        adapter.grantRole(adapter.ROUTER_ROLE(), address(router));
        router.configureTarget(address(target), true);
        remoteExecutor.configureTarget(address(target), true);
        remoteExecutor.configureSourceRouter(REMOTE_EID, address(router), block.chainid);
        router.grantRole(router.DISPATCH_ROLE(), dispatcher);
        vm.stopPrank();
    }

    function testDispatchAndAuthenticatedDelivery() external {
        bytes memory data = abi.encodeCall(MockRemoteTarget.execute, ());
        vm.prank(dispatcher);
        (bytes32 dispatchId, bytes32 outboundGuid) = router.dispatch(
            keccak256("position"),
            REMOTE_EID,
            REMOTE_PEER,
            1,
            address(target),
            data,
            bytes(""),
            uint64(block.timestamp + 1 hours),
            dispatcher
        );
        assertTrue(dispatchId != bytes32(0));
        bytes memory message = abi.encode(
            dispatchId,
            uint8(1),
            block.chainid,
            address(router),
            keccak256("position"),
            uint8(1),
            address(target),
            keccak256(data),
            uint64(0),
            uint64(block.timestamp + 1 hours),
            data
        );
        LzOrigin memory origin = LzOrigin(REMOTE_EID, REMOTE_PEER, 1);
        bytes32 inboundGuid = keccak256("inbound-guid");
        endpoint.deliver(address(adapter), origin, inboundGuid, message);
        assertTrue(outboundGuid != inboundGuid);
        assertEq(target.calls(), 1);
        (,,,,, LayerZeroAdapter.MessageStatus status) = adapter.messages(inboundGuid);
        assertEq(uint256(status), uint256(LayerZeroAdapter.MessageStatus.DELIVERED));
    }

    function testRejectsWrongPeerAndDuplicateGuid() external {
        bytes memory data = abi.encodeCall(MockRemoteTarget.execute, ());
        bytes memory message = abi.encode(
            keccak256("dispatch"),
            uint8(1),
            block.chainid,
            address(router),
            keccak256("position"),
            uint8(1),
            address(target),
            keccak256(data),
            uint64(0),
            uint64(block.timestamp + 1 hours),
            data
        );
        LzOrigin memory wrongOrigin = LzOrigin(999, REMOTE_PEER, 1);
        vm.prank(address(endpoint));
        (bool rejected,) = address(adapter)
            .call(
                abi.encodeCall(
                    LayerZeroAdapter.lzReceive,
                    (wrongOrigin, address(adapter), bytes32(uint256(111)), message, bytes(""))
                )
            );
        assertFalse(rejected);

        LzOrigin memory origin = LzOrigin(REMOTE_EID, REMOTE_PEER, 1);
        bytes32 duplicateGuid = keccak256("guid-ok");
        endpoint.deliver(address(adapter), origin, duplicateGuid, message);
        vm.expectRevert(abi.encodeWithSelector(LayerZeroAdapter.MessageAlreadyHandled.selector, duplicateGuid));
        endpoint.deliver(address(adapter), origin, duplicateGuid, message);
    }

    function testRejectsOutOfOrderNonce() external {
        bytes memory data = abi.encodeCall(MockRemoteTarget.execute, ());
        bytes memory message = abi.encode(
            keccak256("nonce"),
            uint8(1),
            block.chainid,
            address(router),
            keccak256("position"),
            uint8(1),
            address(target),
            keccak256(data),
            uint64(2),
            uint64(block.timestamp + 1 hours),
            data
        );
        LzOrigin memory origin = LzOrigin(REMOTE_EID, REMOTE_PEER, 1);
        vm.expectRevert(abi.encodeWithSelector(RemoteExecutor.InvalidNonce.selector, uint64(0), uint64(2)));
        endpoint.deliver(address(adapter), origin, keccak256("nonce-guid"), message);
    }

    function testExpiredInboundMessageIsNotExecuted() external {
        bytes memory data = abi.encodeCall(MockRemoteTarget.execute, ());
        uint64 expiry = uint64(block.timestamp + 10);
        bytes memory message = abi.encode(
            keccak256("expired"),
            uint8(1),
            block.chainid,
            address(router),
            keccak256("position"),
            uint8(1),
            address(target),
            keccak256(data),
            uint64(0),
            expiry,
            data
        );
        vm.warp(expiry + 1);
        LzOrigin memory origin = LzOrigin(REMOTE_EID, REMOTE_PEER, 1);
        bytes32 guid = keccak256("expired-guid");
        endpoint.deliver(address(adapter), origin, guid, message);
        assertEq(target.calls(), 0);
        (,,,,, LayerZeroAdapter.MessageStatus status) = adapter.messages(guid);
        assertEq(uint256(status), uint256(LayerZeroAdapter.MessageStatus.EXPIRED));
    }
}
