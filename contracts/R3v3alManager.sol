// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

contract R3v3alfunds {
    address payable public builderAdmin;
    uint32 public lockPeriod;
    uint32 public returnRatio = 975; // 97.5% of the staked value will be returned to MapCreator after the lock period
    address public communityPool; // will receive 2.5% of the staked value after the lock period => community Super Prize

    enum MapSize { S, M, L }
    mapping(MapSize => uint256) public stakedFundsByMapSize;

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
        uint256 endOfGame;
        address mapCreator;
        address mapRewardManager;
        uint256 totalReward; // how much the map Creator will fund this submap
        uint256 totalRewardLeft;
        Point[] claimedCoordinates; // already claimed coordinates
    }

    struct Point {
        uint32 x;
        uint32 y;
    }

    event Withdrawal(uint256 amount, address receiver);
    event RewardDistributed(address indexed player, uint256 amount, Point coordinates);

    constructor(uint32 _lockPeriod, address _communityPool, uint64 sStake, uint64 mStake, uint64 lStake) {
        builderAdmin = payable(msg.sender);
        lockPeriod = _lockPeriod * 1 days;
        communityPool = _communityPool;
        stakedFundsByMapSize[MapSize.S] = sStake;
        stakedFundsByMapSize[MapSize.M] = mStake;
        stakedFundsByMapSize[MapSize.L] = lStake;
    }

    function initMap(bytes32 mapId, MapSize mapSize, uint256 totalReward, uint64 totalWinnerCoordinates, uint32 totalSubMaps) public payable {
        require(msg.value == stakedFundsByMapSize[mapSize], "Insufficient staked funds to create map");

        mapInfoByMapId[mapId] = MapInfo({
            lockedFund: msg.value,
            unlockTime: block.timestamp + lockPeriod,
            mapSize: mapSize,
            mapCreator: msg.sender,
            totalReward: totalReward,
            totalWinnerCoordinates: totalWinnerCoordinates,
            totalSubMaps: totalSubMaps
        });

        mapsCreatedByMapCreator[msg.sender].push(mapId);
    }

    function createAndFundMap(bytes32 mapId, bytes32 datasetId, uint32 gameDuration) public payable {
        require(msg.sender == mapInfoByMapId[mapId].mapCreator, "Only the map creator can fund the map");

        SubMapInfo storage subMapInfo = subMapInfoByDatasetId[datasetId];
        subMapInfo.endOfGame = block.timestamp + gameDuration * 1 days;
        subMapInfo.mapCreator = msg.sender;
        subMapInfo.mapRewardManager = msg.sender;
        subMapInfo.totalReward = msg.value;
        subMapInfo.totalRewardLeft = msg.value;

        datasetIdByMapCreator[msg.sender].push(datasetId);
    }

    function distributeReward(bytes32 datasetId, address player, Point calldata winningCoordinates, uint256 rewardedAmount) public {
        SubMapInfo storage subMapInfo = subMapInfoByDatasetId[datasetId];
        require(msg.sender == subMapInfo.mapRewardManager, "Only the map reward manager can distribute rewards");
        require(msg.sender != subMapInfo.mapCreator, "Map creator can't distribute the map reward");
        require(rewardedAmount <= subMapInfo.totalRewardLeft, "Insufficient reward balance");

        for (uint i = 0; i < subMapInfo.claimedCoordinates.length; i++) {
            require(
                subMapInfo.claimedCoordinates[i].x != winningCoordinates.x || 
                subMapInfo.claimedCoordinates[i].y != winningCoordinates.y, 
                "Coordinates already claimed"
            );
        }

        subMapInfo.claimedCoordinates.push(winningCoordinates);
        subMapInfo.totalRewardLeft -= rewardedAmount;

        payable(player).transfer(rewardedAmount);
        emit RewardDistributed(player, rewardedAmount, winningCoordinates);
    }

    function setRewardKeyAddress(bytes32 datasetId, address newRewardDistributor) public {
        SubMapInfo storage subMapInfo = subMapInfoByDatasetId[datasetId];
        require(msg.sender == subMapInfo.mapCreator, "Only the map creator can set the new reward manager");
        require(msg.sender != newRewardDistributor, "Cannot set the new reward manager with your address");

        subMapInfo.mapRewardManager = newRewardDistributor;
    }

    function mapCreatorWithdrawFundsOfStake(bytes32 mapId) public {
        MapInfo storage mapInfo = mapInfoByMapId[mapId];
        require(block.timestamp >= mapInfo.unlockTime, "Unlock period has not yet passed");
        require(msg.sender == mapInfo.mapCreator, "Only the map creator can withdraw funds");

        uint256 withdrawAmount = mapInfo.lockedFund * returnRatio / 1000;
        uint256 communityPoolAmount = mapInfo.lockedFund - withdrawAmount;

        payable(msg.sender).transfer(withdrawAmount);
        emit Withdrawal(withdrawAmount, msg.sender);
        
        payable(communityPool).transfer(communityPoolAmount);
        emit Withdrawal(communityPoolAmount, communityPool);
    }

    function mapCreatorWithdrawOfSubMaps(bytes32 datasetId) public {
        SubMapInfo storage subMapInfo = subMapInfoByDatasetId[datasetId];
        require(block.timestamp >= subMapInfo.endOfGame, "End of game period has not yet passed");
        require(msg.sender == subMapInfo.mapCreator, "Only the map creator can withdraw funds");

        uint256 withdrawAmount = subMapInfo.totalRewardLeft * returnRatio / 1000;
        payable(msg.sender).transfer(withdrawAmount);
        emit Withdrawal(withdrawAmount, msg.sender);
    }

    // SHOW REWARD KEY FOR PLAYER
    function showRewardKey(bytes32 datasetId) external view returns (address) {
        return subMapInfoByDatasetId[datasetId].mapRewardManager;
    }

    // VIEW FUNCTIONS
    function getMapInfo(bytes32 mapId) external view returns (MapInfo memory) {
        return mapInfoByMapId[mapId];
    }

    function getSubMapInfo(bytes32 datasetId) external view returns (SubMapInfo memory) {
        return subMapInfoByDatasetId[datasetId];
    }

    function getMapsByCreator(address creator) external view returns (bytes32[] memory) {
        return mapsCreatedByMapCreator[creator];
    }

    function getDatasetsByCreator(address creator) external view returns (bytes32[] memory) {
        return datasetIdByMapCreator[creator];
    }

    function getClaimedCoordinates(bytes32 datasetId) external view returns (Point[] memory) {
        return subMapInfoByDatasetId[datasetId].claimedCoordinates;
    }

    function getStakedFunds(MapSize mapSize) external view returns (uint256) {
        return stakedFundsByMapSize[mapSize];
    }

    function getRemainingReward(bytes32 datasetId) external view returns (uint256) {
        return subMapInfoByDatasetId[datasetId].totalRewardLeft;
    }

    // Additional view functions

    function getMapCreator(bytes32 mapId) external view returns (address) {
        return mapInfoByMapId[mapId].mapCreator;
    }

    function getMapUnlockTime(bytes32 mapId) external view returns (uint256) {
        return mapInfoByMapId[mapId].unlockTime;
    }

    function getMapTotalReward(bytes32 mapId) external view returns (uint256) {
        return mapInfoByMapId[mapId].totalReward;
    }

    function getMapTotalWinnerCoordinates(bytes32 mapId) external view returns (uint64) {
        return mapInfoByMapId[mapId].totalWinnerCoordinates;
    }

    function getMapTotalSubMaps(bytes32 mapId) external view returns (uint32) {
        return mapInfoByMapId[mapId].totalSubMaps;
    }

    function getSubMapCreator(bytes32 datasetId) external view returns (address) {
        return subMapInfoByDatasetId[datasetId].mapCreator;
    }

}
