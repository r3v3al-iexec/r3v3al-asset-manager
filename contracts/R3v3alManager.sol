// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract R3v3alfunds {

    address payable public builderAdmin;
    uint32 public lockPeriod;
    uint32 public returnRation = 975; // 97.5 % of the staked Value will be returned to MapCreator after 7 days
    address public communityPool; // will recieve 2.5 % of the staked Value after 7 days => community Super Price 

    // Admin deal with total amount of staked Value per Map size 
    enum MapSize {
        S,M,L
    }
    mapping(MapSize => uint64) public StakedFundsByMapSize;

    mapping(address mapCreator => bytes32[] datasetId) public datasetIdByMapCreator;
    mapping(address mapCreator => bytes32[] mapID) public mapsCreatedByMapCreator;

    mapping(bytes32 mapID => MapInfo)  public mapInfoByMapId;
    mapping(bytes32 datasetId => SubMapInfo) public SubMapInfoByDatasetId;

    struct MapInfo{
        uint64 lockedFund;
        uint64 unlockTime;
        MapSize mapSize;
        address mapCreator;
        uint64 totalReward; // total Funds allocated for the entire map / for this campaign // desplayed in frontend 
        uint64 totalWinnerCoordonate; // total Funds allocated for the entire map / for this campaign
        uint32 totalSubMaps; // 
    }

    struct SubMapInfo{
        address mapRewardManager;
        uint64 totalReward; // how much the map Creator will fund this submap 
        uint64 totalRewardLeft;
        Point[] claimedCoordonate ; // already claimed coordinates
    }

    struct Point {
        uint32 x;
        uint32 y;
    }

    event Withdrawal(uint amount, uint when);

    constructor(uint64 _lockPeriod, address _communityPool, uint64 sStake, uint64 mStake,uint64 lStake) payable {

        builderAdmin = payable(msg.sender);
        lockPeriod = _lockPeriod * 1 days;
        communityPool = _communityPool;
        StakedFundsByMapSize[MapSize.S] = sStake;
        StakedFundsByMapSize[MapSize.M] = mStake;
        StakedFundsByMapSize[MapSize.L] = lStake;
    }



    function withdraw() public {
        // Uncomment this line, and the import of "hardhat/console.sol", to print a log in your terminal
        // console.log("Unlock time is %o and block timestamp is %o", unlockTime, block.timestamp);

        require(block.timestamp >= unlockTime, "You can't withdraw yet");
        require(msg.sender == owner, "You aren't the owner");

        emit Withdrawal(address(this).balance, block.timestamp);

        owner.transfer(address(this).balance);
    }
}
