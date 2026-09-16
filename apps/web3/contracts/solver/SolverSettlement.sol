// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IIntentManager} from "../interfaces/IIntentManager.sol";
import {MetronTypes} from "../libraries/MetronTypes.sol";
import {SolverRegistry} from "./SolverRegistry.sol";
import {IntentSettlement} from "./IntentSettlement.sol";

contract SolverSettlement {
    struct Auction {
        uint64 commitDeadline;
        uint64 revealDeadline;
        uint64 settlementDeadline;
        bool selected;
        bytes32 winnerSolverId;
        bytes32 winnerRouteHash;
        bytes32 winnerTraceId;
        int256 winnerScore;
    }

    struct BidCommit {
        bytes32 commitment;
        bytes32 traceId;
        bool revealed;
    }

    struct BidReveal {
        bytes32 routeHash;
        bytes32 traceId;
        int256 score;
        uint256 minimumOutput;
    }

    error InvalidAddress();
    error InvalidIdentifier();
    error InvalidWindow();
    error IntentNotActive(bytes32 intentId);
    error AuctionExists(bytes32 intentId);
    error AuctionNotFound(bytes32 intentId);
    error CommitWindowClosed(bytes32 intentId);
    error RevealWindowClosed(bytes32 intentId);
    error RevealWindowOpen(bytes32 intentId);
    error InvalidCommitment(bytes32 solverId);
    error DuplicateCommit(bytes32 solverId);
    error DuplicateReveal(bytes32 solverId);
    error RouteAlreadySelected(bytes32 routeHash);
    error NoValidWinner(bytes32 intentId);
    error AuctionAlreadySelected(bytes32 intentId);
    error SettlementWindowClosed(bytes32 intentId);

    IIntentManager public immutable intentManager;
    SolverRegistry public immutable solverRegistry;
    IntentSettlement public immutable intentSettlement;
    mapping(bytes32 intentId => Auction auction) public auctions;
    mapping(bytes32 intentId => mapping(bytes32 solverId => BidCommit bid)) public bidCommits;
    mapping(bytes32 intentId => mapping(bytes32 solverId => BidReveal bid)) public bidReveals;
    mapping(bytes32 routeHash => bool used) public usedRoutes;

    event AuctionOpened(
        bytes32 indexed intentId, uint64 commitDeadline, uint64 revealDeadline, uint64 settlementDeadline
    );
    event BidCommitted(bytes32 indexed intentId, bytes32 indexed solverId, bytes32 commitment, bytes32 traceId);
    event BidRevealed(
        bytes32 indexed intentId, bytes32 indexed solverId, bytes32 routeHash, int256 score, bytes32 traceId
    );
    event WinnerSelected(
        bytes32 indexed intentId, bytes32 indexed solverId, bytes32 routeHash, int256 score, bytes32 traceId
    );

    constructor(address intentManager_, address solverRegistry_, address intentSettlement_) {
        if (intentManager_ == address(0) || solverRegistry_ == address(0) || intentSettlement_ == address(0)) {
            revert InvalidAddress();
        }
        intentManager = IIntentManager(intentManager_);
        solverRegistry = SolverRegistry(solverRegistry_);
        intentSettlement = IntentSettlement(intentSettlement_);
    }

    function openAuction(bytes32 intentId, uint64 commitDeadline, uint64 revealDeadline, uint64 settlementDeadline)
        external
    {
        if (auctions[intentId].revealDeadline != 0) revert AuctionExists(intentId);
        if (
            intentId == bytes32(0) || commitDeadline <= block.timestamp || revealDeadline <= commitDeadline
                || settlementDeadline <= revealDeadline
        ) revert InvalidWindow();
        MetronTypes.IntentAuthorization memory intent = intentManager.getIntent(intentId);
        if (intent.status != MetronTypes.IntentStatus.ACTIVE) revert IntentNotActive(intentId);
        if (settlementDeadline > intent.expiresAt) revert InvalidWindow();
        auctions[intentId] = Auction({
            commitDeadline: commitDeadline,
            revealDeadline: revealDeadline,
            settlementDeadline: settlementDeadline,
            selected: false,
            winnerSolverId: bytes32(0),
            winnerRouteHash: bytes32(0),
            winnerTraceId: bytes32(0),
            winnerScore: type(int256).min
        });
        emit AuctionOpened(intentId, commitDeadline, revealDeadline, settlementDeadline);
    }

    function commitBid(bytes32 intentId, bytes32 solverId, bytes32 commitment, bytes32 traceId) external {
        Auction storage auction = _requireAuction(intentId);
        if (block.timestamp > auction.commitDeadline) revert CommitWindowClosed(intentId);
        if (commitment == bytes32(0) || traceId == bytes32(0)) revert InvalidIdentifier();
        solverRegistry.requireOperator(solverId, msg.sender);
        if (bidCommits[intentId][solverId].commitment != bytes32(0)) revert DuplicateCommit(solverId);
        bidCommits[intentId][solverId] = BidCommit({commitment: commitment, traceId: traceId, revealed: false});
        emit BidCommitted(intentId, solverId, commitment, traceId);
    }

    function revealBid(
        bytes32 intentId,
        bytes32 solverId,
        bytes32 routeHash,
        bytes32 salt,
        bytes32 traceId,
        int256 score,
        uint256 minimumOutput
    ) external {
        Auction storage auction = _requireAuction(intentId);
        if (block.timestamp <= auction.commitDeadline || block.timestamp > auction.revealDeadline) {
            revert RevealWindowClosed(intentId);
        }
        solverRegistry.requireOperator(solverId, msg.sender);
        BidCommit storage commit = bidCommits[intentId][solverId];
        if (commit.commitment == bytes32(0)) revert InvalidCommitment(solverId);
        if (commit.revealed) revert DuplicateReveal(solverId);
        if (routeHash == bytes32(0) || salt == bytes32(0) || traceId == bytes32(0)) revert InvalidIdentifier();
        if (keccak256(abi.encode(intentId, solverId, routeHash, salt)) != commit.commitment) {
            revert InvalidCommitment(solverId);
        }
        commit.revealed = true;
        bidReveals[intentId][solverId] =
            BidReveal({routeHash: routeHash, traceId: traceId, score: score, minimumOutput: minimumOutput});
        if (
            auction.winnerSolverId == bytes32(0) || score > auction.winnerScore
                || (score == auction.winnerScore && solverId < auction.winnerSolverId)
        ) {
            auction.winnerSolverId = solverId;
            auction.winnerRouteHash = routeHash;
            auction.winnerTraceId = traceId;
            auction.winnerScore = score;
        }
        emit BidRevealed(intentId, solverId, routeHash, score, traceId);
    }

    function selectWinner(bytes32 intentId, uint256 minimumOutput) external {
        Auction storage auction = _requireAuction(intentId);
        if (block.timestamp <= auction.revealDeadline) revert RevealWindowOpen(intentId);
        if (block.timestamp > auction.settlementDeadline) revert SettlementWindowClosed(intentId);
        if (auction.selected) revert AuctionAlreadySelected(intentId);
        if (auction.winnerSolverId == bytes32(0)) revert NoValidWinner(intentId);
        if (usedRoutes[auction.winnerRouteHash]) revert RouteAlreadySelected(auction.winnerRouteHash);
        usedRoutes[auction.winnerRouteHash] = true;
        auction.selected = true;
        BidReveal memory reveal = bidReveals[intentId][auction.winnerSolverId];
        uint256 selectedMinimumOutput = minimumOutput > reveal.minimumOutput ? minimumOutput : reveal.minimumOutput;
        intentSettlement.authorizeSettlement(
            intentId,
            auction.winnerSolverId,
            auction.winnerRouteHash,
            auction.winnerTraceId,
            selectedMinimumOutput,
            auction.settlementDeadline
        );
        emit WinnerSelected(
            intentId, auction.winnerSolverId, auction.winnerRouteHash, auction.winnerScore, auction.winnerTraceId
        );
    }

    function computeCommitment(bytes32 intentId, bytes32 solverId, bytes32 routeHash, bytes32 salt)
        external
        pure
        returns (bytes32)
    {
        return keccak256(abi.encode(intentId, solverId, routeHash, salt));
    }

    function _requireAuction(bytes32 intentId) private view returns (Auction storage auction) {
        auction = auctions[intentId];
        if (auction.revealDeadline == 0) revert AuctionNotFound(intentId);
    }
}
