// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

contract R3v3alfunds {

    address payable public builderAdmin;
    uint32 public lockPeriod;
    uint32 public returnRatio = 975; // 97.5% of the staked Value will be returned to MapCreator after the lock period
    address public communityPool; // will receive 2.5% of the staked Value after the lock period => community Super Prize

    // Admin deal with total amount of staked Value per Map size
    enum MapSize { S, M, L }
    mapping(MapSize => uint64) public stakedFundsByMapSize;

    mapping(address => bytes32[]) public datasetIdByMapCreator;
    mapping(address => bytes32[]) public mapsCreatedByMapCreator;

    mapping(bytes32 => MapInfo) public mapInfoByMapId;
    mapping(bytes32 => SubMapInfo) public subMapInfoByDatasetId;

    struct MapInfo {
        uint256 lockedFund;
        uint256 unlockTime;
        MapSize mapSize;
        address mapCreator;
        uint256 totalReward; // total Funds allocated for the entire map / for this campaign // displayed in frontend
        uint64 totalWinnerCoordinates; // total Funds allocated for the entire map / for this campaign
        uint32 totalSubMaps;
    }

    struct SubMapInfo {
        uint64 endOfGame;
        address mapCreator;
        address mapRewardManager;
        uint64 totalReward; // how much the map Creator will fund this submap
        uint64 totalRewardLeft;
        Point[] claimedCoordinates; // already claimed coordinates
    }

    struct Point {
        uint32 x;
        uint32 y;
    }

    event Withdrawal(uint256 amount, address receiver);

    constructor(uint32 _lockPeriod, address _communityPool, uint64 sStake, uint64 mStake, uint64 lStake) {
        builderAdmin = payable(msg.sender);
        lockPeriod = _lockPeriod * 1 days;
        communityPool = _communityPool;
        stakedFundsByMapSize[MapSize.S] = sStake;
        stakedFundsByMapSize[MapSize.M] = mStake;
        stakedFundsByMapSize[MapSize.L] = lStake;
    }
 
    function initMap(bytes32 mapID, MapSize mapSize, uint256 totalReward, uint64 totalWinnerCoordinates, uint32 totalSubMaps) public payable {
        require(msg.value == stakedFundsByMapSize[mapSize], "Insufficient staked funds to create map");
        mapInfoByMapId[mapID] = MapInfo({
            lockedFund: msg.value,
            unlockTime: block.timestamp + lockPeriod,
            mapSize: mapSize,
            mapCreator: msg.sender,
            totalReward: totalReward,
            totalWinnerCoordinates: totalWinnerCoordinates,
            totalSubMaps: totalSubMaps
        });
    }

    function createAndFundMap(bytes32 mapID, bytes32 datasetId) public {
        require(msg.sender == mapInfoByMapId[mapID].mapCreator, "Only the map creator can fund the map");
        // Add logic to fund the map with the datasetId
    }

    /// WITHDRAW FUNCTIONS FOR MAP CREATOR
    function mapCreatorWithdrawFundsOfStake(bytes32 mapID) public {
        require(block.timestamp >= mapInfoByMapId[mapID].unlockTime, "Unlock period has not yet passed");
        require(msg.sender == mapInfoByMapId[mapID].mapCreator, "Only the map creator can withdraw funds");

        uint256 withdrawAmount = mapInfoByMapId[mapID].lockedFund * returnRatio / 1000;
        uint256 communityPoolAmount = mapInfoByMapId[mapID].lockedFund - withdrawAmount;
        payable(msg.sender).transfer(withdrawAmount);
        emit Withdrawal(withdrawAmount, msg.sender);
        payable(communityPool).transfer(communityPoolAmount);
        emit Withdrawal(communityPoolAmount, communityPool);
    }

    function mapCreatorWithdrawOfSubMaps(bytes32 datasetId) public {
        require(block.timestamp >= subMapInfoByDatasetId[datasetId].endOfGame, "End of game period has not yet passed");
        require(msg.sender == subMapInfoByDatasetId[datasetId].mapCreator, "Only the map creator can withdraw funds");

        uint64 withdrawAmount = subMapInfoByDatasetId[datasetId].totalRewardLeft * returnRatio / 1000;
        payable(msg.sender).transfer(withdrawAmount);
        emit Withdrawal(withdrawAmount, msg.sender);
    }

    // SHOW REWARD KEY FOR PLAYER
    function showRewardKey(bytes32 datasetId) external view returns (address) {
        return subMapInfoByDatasetId[datasetId].mapRewardManager;
    }
}
