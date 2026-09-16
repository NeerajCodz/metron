// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

struct LzMessagingParams {
    uint32 dstEid;
    bytes32 receiver;
    bytes message;
    bytes options;
    bool payInLzToken;
}

struct LzMessagingReceipt {
    bytes32 guid;
    uint64 nonce;
    uint256 nativeFee;
    uint256 lzTokenFee;
}

struct LzOrigin {
    uint32 srcEid;
    bytes32 sender;
    uint64 nonce;
}

interface ILayerZeroEndpointV2 {
    function quote(LzMessagingParams calldata params, address sender)
        external
        view
        returns (uint256 nativeFee, uint256 lzTokenFee);

    function send(LzMessagingParams calldata params, address refundAddress)
        external
        payable
        returns (LzMessagingReceipt memory receipt);
}
