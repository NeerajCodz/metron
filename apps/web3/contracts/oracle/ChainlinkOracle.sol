// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IChainlinkAggregatorV3} from "../interfaces/IChainlinkAggregatorV3.sol";
import {IOracleAdapter} from "../interfaces/IOracleAdapter.sol";
import {IPriceObserver} from "../interfaces/IPriceObserver.sol";

contract ChainlinkOracle is AccessControl, IOracleAdapter {
    bytes32 public constant FEED_ADMIN_ROLE = keccak256("FEED_ADMIN_ROLE");

    struct FeedConfig {
        address feed;
        address secondaryObserver;
        uint32 maxAge;
        uint16 maxDeviationBps;
        bool enabled;
    }

    error InvalidAddress();
    error InvalidConfiguration();
    error FeedNotConfigured(address asset);
    error FeedDisabled(address asset);
    error InvalidRound(address feed, uint80 roundId, uint80 answeredInRound);
    error InvalidAnswer(address feed, int256 answer);
    error StaleAnswer(address feed, uint256 updatedAt, uint256 maximumAge);
    error FutureAnswer(address feed, uint256 updatedAt);
    error DecimalOverflow(uint8 decimals);
    error PriceDeviationExceeded(address asset, uint256 primaryPrice, uint256 secondaryPrice, uint256 maximumBps);

    mapping(address asset => FeedConfig config) public feeds;

    event FeedConfigured(
        address indexed asset, address indexed feed, uint32 maxAge, uint16 maxDeviationBps, bool enabled
    );
    event SecondaryObserverConfigured(address indexed asset, address indexed observer);

    constructor(address admin) {
        if (admin == address(0)) revert InvalidAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(FEED_ADMIN_ROLE, admin);
    }

    function configureFeed(address asset, address feed, uint32 maxAge, uint16 maxDeviationBps, bool enabled)
        external
        onlyRole(FEED_ADMIN_ROLE)
    {
        if (asset == address(0) || feed == address(0)) revert InvalidAddress();
        if (maxAge == 0 || maxDeviationBps > 10_000) revert InvalidConfiguration();
        feeds[asset].feed = feed;
        feeds[asset].maxAge = maxAge;
        feeds[asset].maxDeviationBps = maxDeviationBps;
        feeds[asset].enabled = enabled;
        emit FeedConfigured(asset, feed, maxAge, maxDeviationBps, enabled);
    }

    function configureSecondaryObserver(address asset, address observer) external onlyRole(FEED_ADMIN_ROLE) {
        if (asset == address(0)) revert InvalidAddress();
        if (observer == address(0) && feeds[asset].feed == address(0)) revert FeedNotConfigured(asset);
        feeds[asset].secondaryObserver = observer;
        emit SecondaryObserverConfigured(asset, observer);
    }

    function getPrice(address asset) external view override returns (uint256 priceWad, uint256 updatedAt) {
        FeedConfig memory config = feeds[asset];
        if (config.feed == address(0)) revert FeedNotConfigured(asset);
        if (!config.enabled) revert FeedDisabled(asset);

        (uint80 roundId, int256 answer,, uint256 feedUpdatedAt, uint80 answeredInRound) =
            IChainlinkAggregatorV3(config.feed).latestRoundData();
        if (answer <= 0) revert InvalidAnswer(config.feed, answer);
        if (answeredInRound < roundId || roundId == 0) {
            revert InvalidRound(config.feed, roundId, answeredInRound);
        }
        if (feedUpdatedAt > block.timestamp) revert FutureAnswer(config.feed, feedUpdatedAt);
        if (feedUpdatedAt == 0 || block.timestamp - feedUpdatedAt > config.maxAge) {
            revert StaleAnswer(config.feed, feedUpdatedAt, config.maxAge);
        }
        priceWad = _scaleToWad(uint256(answer), IChainlinkAggregatorV3(config.feed).decimals());
        updatedAt = feedUpdatedAt;

        if (config.secondaryObserver != address(0) && config.maxDeviationBps != 0) {
            (uint256 secondaryPrice, uint8 secondaryDecimals, uint256 secondaryUpdatedAt) =
                IPriceObserver(config.secondaryObserver).observePrice(asset);
            if (secondaryPrice == 0) revert InvalidConfiguration();
            if (secondaryUpdatedAt > block.timestamp) {
                revert FutureAnswer(config.secondaryObserver, secondaryUpdatedAt);
            }
            if (secondaryUpdatedAt == 0 || block.timestamp - secondaryUpdatedAt > config.maxAge) {
                revert StaleAnswer(config.secondaryObserver, secondaryUpdatedAt, config.maxAge);
            }
            uint256 secondaryWad = _scaleToWad(secondaryPrice, secondaryDecimals);
            uint256 difference = priceWad > secondaryWad ? priceWad - secondaryWad : secondaryWad - priceWad;
            uint256 referencePrice = priceWad > secondaryWad ? priceWad : secondaryWad;
            if (difference > (referencePrice * config.maxDeviationBps) / 10_000) {
                revert PriceDeviationExceeded(asset, priceWad, secondaryWad, config.maxDeviationBps);
            }
        }
    }

    function _scaleToWad(uint256 value, uint8 decimals) private pure returns (uint256) {
        if (decimals == 18) return value;
        if (decimals < 18) return value * (10 ** (18 - decimals));
        uint8 divisorExponent = decimals - 18;
        if (divisorExponent > 77) revert DecimalOverflow(decimals);
        return value / (10 ** divisorExponent);
    }
}
