// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract R3v3alfunds {

    uint32 public lockPeriod;
    address payable public owner;
    mapping(address mapCreator => bytes32 datasetId) public datasetIdByMapCreator;
    mapping(bytes32 datasetId => address mapRewardManager) public mapRewardManagerByDatasetId;
    mapping(address mapID => uint64 lockedFund) public lockedFundByMapId;
    mapping(address mapID => address mapCreator)  public mapCreatorByMapId;
    enum MapSize {
        S,M,L
    }
    mapping(MapSize => uint64) public StakedFundsByMapSize;
    struct MapInfo{
        uint64 lockedFund;
        MapSize mapSize;
        address mapCreator;
    }



    event Withdrawal(uint amount, uint when);

    constructor(uint64 _lockPeriod) payable {

        lockPeriod = _lockPeriod * 1 days;
        owner = payable(msg.sender);
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
