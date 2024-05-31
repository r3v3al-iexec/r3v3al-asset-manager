import { time, loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import {ethers} from "hardhat";

describe("R3v3alfunds", function () {
    async function deployR3v3alfundsFixture() {
        const [owner, otherAccount, player, communityPool,rewardDistributor] = await ethers.getSigners();
        const lockPeriod = 30; // 30 days lock period
        const sStake = ethers.parseEther("1");
        const mStake = ethers.parseEther("2");
        const lStake = ethers.parseEther("3");

        const R3v3alfunds = await ethers.getContractFactory("R3v3alfunds");
        const r3v3alfunds = await R3v3alfunds.deploy(lockPeriod, communityPool.address, sStake, mStake, lStake);

        return { r3v3alfunds, owner, otherAccount, player, communityPool, rewardDistributor,lockPeriod,sStake, mStake, lStake };
    }

    describe("Deployment", function () {
        it("Should set the right lock period and community pool", async function () {
            const { r3v3alfunds, communityPool, owner } = await loadFixture(deployR3v3alfundsFixture);

            expect(await r3v3alfunds.lockPeriod()).to.equal(30 * 24 * 60 * 60); // 30 days in seconds
            expect(await r3v3alfunds.communityPool()).to.equal(communityPool.address);
        });

        it("Should set the staked funds for each map size", async function () {
            const { r3v3alfunds, sStake, mStake, lStake } = await loadFixture(deployR3v3alfundsFixture);

            expect(await r3v3alfunds.stakedFundsByMapSize(0)).to.equal(sStake); // MapSize.S
            expect(await r3v3alfunds.stakedFundsByMapSize(1)).to.equal(mStake); // MapSize.M
            expect(await r3v3alfunds.stakedFundsByMapSize(2)).to.equal(lStake); // MapSize.L
        });
    });

    describe("Map Creation", function () {
        it("Should create a map and fund it", async function () {
            const { r3v3alfunds, owner, sStake } = await loadFixture(deployR3v3alfundsFixture);
            const mapId = ethers.encodeBytes32String("map1");
            const totalReward = ethers.parseEther("10");
            const totalWinnerCoordinates = 100;
            const totalSubMaps = 10;

            await r3v3alfunds.connect(owner).initMap(mapId, 0, totalReward, totalWinnerCoordinates, totalSubMaps, { value: sStake });

            const mapInfo = await r3v3alfunds.mapInfoByMapId(mapId);
            expect(mapInfo.lockedFund).to.equal(sStake);
            expect(mapInfo.mapCreator).to.equal(owner.address);
            expect(mapInfo.totalReward).to.equal(totalReward);
        });

        it("Should create and fund a sub-map", async function () {
            const { r3v3alfunds, owner, sStake } = await loadFixture(deployR3v3alfundsFixture);
            const mapId = ethers.encodeBytes32String("map1");
            const datasetId = ethers.encodeBytes32String("dataset1");
            const totalReward = ethers.parseEther("10");
            const gameDuration = 10;

            await r3v3alfunds.connect(owner).initMap(mapId, 0, totalReward, 100, 10, { value: sStake });
            await r3v3alfunds.connect(owner).createAndFundMap(mapId, datasetId, gameDuration, { value: totalReward });

            const subMapInfo = await r3v3alfunds.subMapInfoByDatasetId(datasetId);
            expect(subMapInfo.totalReward).to.equal(totalReward);
            expect(subMapInfo.mapCreator).to.equal(owner.address);
        });
    });

    describe("Rewards", function () {
        it("Should distribute rewards correctly", async function () {
            const { r3v3alfunds, owner, player,rewardDistributor ,sStake } = await loadFixture(deployR3v3alfundsFixture);
            const mapId = ethers.encodeBytes32String("map1");
            const datasetId = ethers.encodeBytes32String("dataset1");
            const totalReward = ethers.parseEther("10");
            const gameDuration = 10;
            const winningCoordinates = { x: 1, y: 2 };
            const rewardAmount = ethers.parseEther("1");

            await r3v3alfunds.connect(owner).initMap(mapId, 0, totalReward, 100, 10, { value: sStake });
            await r3v3alfunds.connect(owner).createAndFundMap(mapId, datasetId, gameDuration, { value: totalReward });
            await r3v3alfunds.connect(owner).setRewardKeyAddress(datasetId,rewardDistributor);
            await r3v3alfunds.connect(rewardDistributor).distributeReward(datasetId, player.address, winningCoordinates, rewardAmount);

            const subMapInfo = await r3v3alfunds.subMapInfoByDatasetId(datasetId);
            expect(subMapInfo.totalRewardLeft).to.equal(totalReward - rewardAmount);
        });
    });

    describe("Withdrawals", function () {
        it("Should allow the map creator to withdraw staked funds after the lock period", async function () {
            const { r3v3alfunds, owner, communityPool, lockPeriod,sStake } = await loadFixture(deployR3v3alfundsFixture);
            const mapId = ethers.encodeBytes32String("map1");
            const totalReward = ethers.parseEther("10");

            await r3v3alfunds.connect(owner).initMap(mapId, 0, totalReward, 100, 10, { value: sStake });

            await time.increase(lockPeriod * 24 * 60 * 60 );

            const withdrawTx = await r3v3alfunds.connect(owner).mapCreatorWithdrawFundsOfStake(mapId);

            await expect(withdrawTx).to.emit(r3v3alfunds, "Withdrawal").withArgs(anyValue, owner.address);
            await expect(withdrawTx).to.emit(r3v3alfunds, "Withdrawal").withArgs(anyValue, communityPool.address);
        });

        it("Should allow the map creator to withdraw remaining sub-map funds after the end of the game", async function () {
            const { r3v3alfunds, owner, sStake } = await loadFixture(deployR3v3alfundsFixture);
            const mapId = ethers.encodeBytes32String("map1");
            const datasetId = ethers.encodeBytes32String("dataset1");
            const totalReward = ethers.parseEther("10");
            const gameDuration = 10;

            await r3v3alfunds.connect(owner).initMap(mapId, 0, totalReward, 100, 10, { value: sStake });
            await r3v3alfunds.connect(owner).createAndFundMap(mapId, datasetId, gameDuration, { value: totalReward });

            await time.increase(gameDuration  * 24 * 60 * 60);

            const withdrawTx = await r3v3alfunds.connect(owner).mapCreatorWithdrawOfSubMaps(datasetId);

            await expect(withdrawTx).to.emit(r3v3alfunds, "Withdrawal").withArgs(anyValue, owner.address);
        });
    });

    describe("View Functions", function () {
        it("Should return map info", async function () {
            const { r3v3alfunds, owner, sStake } = await loadFixture(deployR3v3alfundsFixture);
            const mapId = ethers.encodeBytes32String("map1");
            const totalReward = ethers.parseEther("10");

            await r3v3alfunds.connect(owner).initMap(mapId, 0, totalReward, 100, 10, { value: sStake });

            const mapInfo = await r3v3alfunds.getMapInfo(mapId);
            expect(mapInfo.mapCreator).to.equal(owner.address);
        });

        it("Should return sub-map info", async function () {
            const { r3v3alfunds, owner, sStake } = await loadFixture(deployR3v3alfundsFixture);
            const mapId = ethers.encodeBytes32String("map1");
            const datasetId = ethers.encodeBytes32String("dataset1");
            const totalReward = ethers.parseEther("10");
            const gameDuration = 10;

            await r3v3alfunds.connect(owner).initMap(mapId, 0, totalReward, 100, 10, { value: sStake });
            await r3v3alfunds.connect(owner).createAndFundMap(mapId, datasetId, gameDuration, { value: totalReward });

            const subMapInfo = await r3v3alfunds.getSubMapInfo(datasetId);
            expect(subMapInfo.mapCreator).to.equal(owner.address);
        });

        it("Should return maps created by a creator", async function () {
            const { r3v3alfunds, owner, sStake } = await loadFixture(deployR3v3alfundsFixture);
            const mapId = ethers.encodeBytes32String("map1");
            const totalReward = ethers.parseEther("10");

            await r3v3alfunds.connect(owner).initMap(mapId, 0, totalReward, 100, 10, { value: sStake });

            const maps = await r3v3alfunds.getMapsByCreator(owner.address);
            expect(maps.length).to.equal(1);
            expect(maps[0]).to.equal(mapId);
        });

        it("Should return datasets created by a creator", async function () {
            const { r3v3alfunds, owner, sStake } = await loadFixture(deployR3v3alfundsFixture);
            const mapId = ethers.encodeBytes32String("map1");
            const datasetId = ethers.encodeBytes32String("dataset1");
            const totalReward = ethers.parseEther("10");
            const gameDuration = 10;

            await r3v3alfunds.connect(owner).initMap(mapId, 0, totalReward, 100, 10, { value: sStake });
            await r3v3alfunds.connect(owner).createAndFundMap(mapId, datasetId, gameDuration, { value: totalReward });

            const datasets = await r3v3alfunds.getDatasetsByCreator(owner.address);
            expect(datasets.length).to.equal(1);
            expect(datasets[0]).to.equal(datasetId);
        });
    });

    describe("R3v3alfunds - Additional Tests", function () {
        describe("Map Creation Failures", function () {
            it("Should fail to create a map with insufficient staked funds", async function () {
                const { r3v3alfunds, owner } = await loadFixture(deployR3v3alfundsFixture);
                const mapId = ethers.encodeBytes32String("map1");
                const totalReward = ethers.parseEther("10");
                const insufficientStake = ethers.parseEther("0.5");
    
                await expect(
                    r3v3alfunds.connect(owner).initMap(mapId, 0, totalReward, 100, 10, { value: insufficientStake })
                ).to.be.revertedWith("Insufficient staked funds to create map");
            });
    
            it("Should fail to create and fund a sub-map by non-map creator", async function () {
                const { r3v3alfunds, owner, otherAccount, sStake } = await loadFixture(deployR3v3alfundsFixture);
                const mapId = ethers.encodeBytes32String("map1");
                const datasetId = ethers.encodeBytes32String("dataset1");
                const totalReward = ethers.parseEther("10");
                const gameDuration = 10;
    
                await r3v3alfunds.connect(owner).initMap(mapId, 0, totalReward, 100, 10, { value: sStake });
    
                await expect(
                    r3v3alfunds.connect(otherAccount).createAndFundMap(mapId, datasetId, gameDuration, { value: totalReward })
                ).to.be.revertedWith("Only the map creator can fund the map");
            });
        });
    
        describe("Rewards Failures", function () {
            it("Should fail to distribute rewards by non-reward manager", async function () {
                const { r3v3alfunds, owner, player, otherAccount, sStake } = await loadFixture(deployR3v3alfundsFixture);
                const mapId = ethers.encodeBytes32String("map1");
                const datasetId = ethers.encodeBytes32String("dataset1");
                const totalReward = ethers.parseEther("10");
                const gameDuration = 10;
                const winningCoordinates = { x: 1, y: 2 };
                const rewardAmount = ethers.parseEther("1");
    
                await r3v3alfunds.connect(owner).initMap(mapId, 0, totalReward, 100, 10, { value: sStake });
                await r3v3alfunds.connect(owner).createAndFundMap(mapId, datasetId, gameDuration, { value: totalReward });
    
                await expect(
                    r3v3alfunds.connect(otherAccount).distributeReward(datasetId, player.address, winningCoordinates, rewardAmount)
                ).to.be.revertedWith("Only the map reward manager can distribute rewards");
            });
    
            it("Should fail to distribute rewards with insufficient reward balance", async function () {
                const { r3v3alfunds, owner, player, sStake,rewardDistributor } = await loadFixture(deployR3v3alfundsFixture);
                const mapId = ethers.encodeBytes32String("map1");
                const datasetId = ethers.encodeBytes32String("dataset1");
                const totalReward = ethers.parseEther("1"); // Small reward for testing
                const gameDuration = 10;
                const winningCoordinates = { x: 1, y: 2 };
                const rewardAmount = ethers.parseEther("2"); // More than the total reward
    
                await r3v3alfunds.connect(owner).initMap(mapId, 0, totalReward, 100, 10, { value: sStake });
                await r3v3alfunds.connect(owner).createAndFundMap(mapId, datasetId, gameDuration, { value: totalReward });
                await r3v3alfunds.connect(owner).setRewardKeyAddress(datasetId,rewardDistributor);
                await expect(
                    r3v3alfunds.connect(rewardDistributor).distributeReward(datasetId, player.address, winningCoordinates, rewardAmount)
                ).to.be.revertedWith("Insufficient reward balance");
            });
    
            it("Should prevent double spending of coordinates", async function () {
                const { r3v3alfunds, owner, player, sStake ,rewardDistributor} = await loadFixture(deployR3v3alfundsFixture);
                const mapId = ethers.encodeBytes32String("map1");
                const datasetId = ethers.encodeBytes32String("dataset1");
                const totalReward = ethers.parseEther("10");
                const gameDuration = 10;
                const winningCoordinates = { x: 1, y: 2 };
                const rewardAmount = ethers.parseEther("1");
    
                await r3v3alfunds.connect(owner).initMap(mapId, 0, totalReward, 100, 10, { value: sStake });
                await r3v3alfunds.connect(owner).createAndFundMap(mapId, datasetId, gameDuration, { value: totalReward });
                await r3v3alfunds.connect(owner).setRewardKeyAddress(datasetId,rewardDistributor);
                await r3v3alfunds.connect(rewardDistributor).distributeReward(datasetId, player.address, winningCoordinates, rewardAmount);
    
                await expect(
                    r3v3alfunds.connect(rewardDistributor).distributeReward(datasetId, player.address, winningCoordinates, rewardAmount)
                ).to.be.revertedWith("Coordinates already claimed");
            });
        });
    
        describe("Withdrawals Failures", function () {
            it("Should fail to withdraw staked funds before lock period ends", async function () {
                const { r3v3alfunds, owner, sStake } = await loadFixture(deployR3v3alfundsFixture);
                const mapId = ethers.encodeBytes32String("map1");
                const totalReward = ethers.parseEther("10");
    
                await r3v3alfunds.connect(owner).initMap(mapId, 0, totalReward, 100, 10, { value: sStake });
    
                await expect(
                    r3v3alfunds.connect(owner).mapCreatorWithdrawFundsOfStake(mapId)
                ).to.be.revertedWith("Unlock period has not yet passed");
            });
    
            it("Should fail to withdraw sub-map funds before game duration ends", async function () {
                const { r3v3alfunds, owner, sStake } = await loadFixture(deployR3v3alfundsFixture);
                const mapId = ethers.encodeBytes32String("map1");
                const datasetId = ethers.encodeBytes32String("dataset1");
                const totalReward = ethers.parseEther("10");
                const gameDuration = 10;
    
                await r3v3alfunds.connect(owner).initMap(mapId, 0, totalReward, 100, 10, { value: sStake });
                await r3v3alfunds.connect(owner).createAndFundMap(mapId, datasetId, gameDuration, { value: totalReward });
    
                await expect(
                    r3v3alfunds.connect(owner).mapCreatorWithdrawOfSubMaps(datasetId)
                ).to.be.revertedWith("End of game period has not yet passed");
            });
        });
    
        describe("Updating Reward Manager", function () {
            it("Should update the reward manager and allow only the new manager to distribute rewards", async function () {
                const { r3v3alfunds, owner, otherAccount, player, sStake,rewardDistributor } = await loadFixture(deployR3v3alfundsFixture);
                const mapId = ethers.encodeBytes32String("map1");
                const datasetId = ethers.encodeBytes32String("dataset1");
                const totalReward = ethers.parseEther("10");
                const gameDuration = 10;
                const winningCoordinates = { x: 1, y: 2 };
                const rewardAmount = ethers.parseEther("1");
    
                await r3v3alfunds.connect(owner).initMap(mapId, 0, totalReward, 100, 10, { value: sStake });
                await r3v3alfunds.connect(owner).createAndFundMap(mapId, datasetId, gameDuration, { value: totalReward });
    
                await r3v3alfunds.connect(owner).setRewardKeyAddress(datasetId, otherAccount.address);
    
                await expect(
                    r3v3alfunds.connect(owner).distributeReward(datasetId, player.address, winningCoordinates, rewardAmount)
                ).to.be.revertedWith("Only the map reward manager can distribute rewards");
                await r3v3alfunds.connect(owner).setRewardKeyAddress(datasetId,rewardDistributor);
                await r3v3alfunds.connect(rewardDistributor).distributeReward(datasetId, player.address, winningCoordinates, rewardAmount);
                const subMapInfo = await r3v3alfunds.subMapInfoByDatasetId(datasetId);
                expect(subMapInfo.totalRewardLeft).to.equal(totalReward - rewardAmount);
            });
        });
    
        describe("View Functions", function () {
            it("Should return correct map info after initialization", async function () {
                const { r3v3alfunds, owner, sStake } = await loadFixture(deployR3v3alfundsFixture);
                const mapId = ethers.encodeBytes32String("map1");
                const totalReward = ethers.parseEther("10");
    
                await r3v3alfunds.connect(owner).initMap(mapId, 0, totalReward, 100, 10, { value: sStake });
    
                const mapInfo = await r3v3alfunds.getMapInfo(mapId);
                expect(mapInfo.mapCreator).to.equal(owner.address);
                expect(mapInfo.lockedFund).to.equal(sStake);
            });
    
            it("Should return correct sub-map info after funding", async function () {
                const { r3v3alfunds, owner, sStake } = await loadFixture(deployR3v3alfundsFixture);
                const mapId = ethers.encodeBytes32String("map1");
                const datasetId = ethers.encodeBytes32String("dataset1");
                const totalReward = ethers.parseEther("10");
                const gameDuration = 10;
    
                await r3v3alfunds.connect(owner).initMap(mapId, 0, totalReward, 100, 10, { value: sStake });
                await r3v3alfunds.connect(owner).createAndFundMap(mapId, datasetId, gameDuration, { value: totalReward });
    
                const subMapInfo = await r3v3alfunds.getSubMapInfo(datasetId);
                expect(subMapInfo.mapCreator).to.equal(owner.address);
                expect(subMapInfo.totalReward).to.equal(totalReward);
            });
        });
    });
    
});
