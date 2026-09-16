// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {ChainlinkOracle} from "../../contracts/oracle/ChainlinkOracle.sol";
import {IChainlinkAggregatorV3} from "../../contracts/interfaces/IChainlinkAggregatorV3.sol";
import {IPriceObserver} from "../../contracts/interfaces/IPriceObserver.sol";

contract AggregatorMock is IChainlinkAggregatorV3 {
    uint8 private feedDecimals;
    uint80 private roundId;
    int256 private answer;
    uint256 private updatedAt;
    uint80 private answeredInRound;

    constructor(uint8 decimals_, int256 answer_, uint256 updatedAt_) {
        feedDecimals = decimals_;
        setRound(1, answer_, updatedAt_, 1);
    }

    function setRound(uint80 roundId_, int256 answer_, uint256 updatedAt_, uint80 answeredInRound_) public {
        roundId = roundId_;
        answer = answer_;
        updatedAt = updatedAt_;
        answeredInRound = answeredInRound_;
    }

    function decimals() external view returns (uint8) {
        return feedDecimals;
    }

    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        return (roundId, answer, 0, updatedAt, answeredInRound);
    }
}

contract PriceObserverMock is IPriceObserver {
    uint256 public price;
    uint8 public decimals;
    uint256 public updatedAt;

    function setPrice(uint256 price_, uint8 decimals_, uint256 updatedAt_) external {
        price = price_;
        decimals = decimals_;
        updatedAt = updatedAt_;
    }

    function observePrice(address) external view returns (uint256, uint8, uint256) {
        return (price, decimals, updatedAt);
    }
}

contract ChainlinkOracleTest is Test {
    address private admin = makeAddr("admin");
    address private asset = makeAddr("asset");
    ChainlinkOracle private oracle;
    AggregatorMock private feed;
    PriceObserverMock private observer;

    function setUp() public {
        oracle = new ChainlinkOracle(admin);
        feed = new AggregatorMock(8, 2_000e8, block.timestamp);
        observer = new PriceObserverMock();
        vm.prank(admin);
        oracle.configureFeed(asset, address(feed), 1 hours, 100, true);
    }

    function test_NormalizesPositiveFreshAnswer() public view {
        (uint256 priceWad, uint256 updatedAt) = oracle.getPrice(asset);
        assertEq(priceWad, 2_000e18);
        assertEq(updatedAt, block.timestamp);
    }

    function test_RejectsStaleAnswer() public {
        vm.warp(2 hours);
        uint256 staleAt = block.timestamp - 1 hours - 1;
        feed.setRound(2, 2_000e8, staleAt, 2);
        vm.expectRevert(abi.encodeWithSelector(ChainlinkOracle.StaleAnswer.selector, address(feed), staleAt, 1 hours));
        oracle.getPrice(asset);
    }

    function test_RejectsNegativeAndIncompleteAnswers() public {
        feed.setRound(2, -1, block.timestamp, 2);
        vm.expectRevert(abi.encodeWithSelector(ChainlinkOracle.InvalidAnswer.selector, address(feed), int256(-1)));
        oracle.getPrice(asset);

        feed.setRound(3, 2_000e8, block.timestamp, 2);
        vm.expectRevert(
            abi.encodeWithSelector(ChainlinkOracle.InvalidRound.selector, address(feed), uint80(3), uint80(2))
        );
        oracle.getPrice(asset);
    }

    function test_OptionalSecondaryObserverEnforcesDeviation() public {
        observer.setPrice(2_010e18, 18, block.timestamp);
        vm.startPrank(admin);
        oracle.configureSecondaryObserver(asset, address(observer));
        vm.stopPrank();
        (uint256 normalizedPrice,) = oracle.getPrice(asset);
        assertEq(normalizedPrice, 2_000e18);

        observer.setPrice(2_100e18, 18, block.timestamp);
        vm.expectRevert(
            abi.encodeWithSelector(ChainlinkOracle.PriceDeviationExceeded.selector, asset, 2_000e18, 2_100e18, 100)
        );
        oracle.getPrice(asset);
    }

    function test_RejectsFutureSecondaryObservation() public {
        observer.setPrice(2_000e18, 18, block.timestamp);
        vm.prank(admin);
        oracle.configureSecondaryObserver(asset, address(observer));
        observer.setPrice(2_000e18, 18, block.timestamp + 1);

        vm.expectRevert(
            abi.encodeWithSelector(ChainlinkOracle.FutureAnswer.selector, address(observer), block.timestamp + 1)
        );
        oracle.getPrice(asset);
    }

    function test_DisabledAndUnknownFeedsFailClosed() public {
        vm.prank(admin);
        oracle.configureFeed(asset, address(feed), 1 hours, 100, false);
        vm.expectRevert(abi.encodeWithSelector(ChainlinkOracle.FeedDisabled.selector, asset));
        oracle.getPrice(asset);

        vm.expectRevert(abi.encodeWithSelector(ChainlinkOracle.FeedNotConfigured.selector, makeAddr("unknown")));
        oracle.getPrice(makeAddr("unknown"));
    }
}
