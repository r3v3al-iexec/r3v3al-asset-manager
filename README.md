# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a Hardhat Ignition module that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.ts
```

```mermaid
    sequenceDiagram
        subgraph Participants
            A[Builder Admin]
            B[Map Creator]
            C[Community Pool]
            D[Players]
        end

        subgraph Contract State
            E[Staked Funds by Map Size]
            F[Map Info by Map ID]
            G[Sub Map Info by Dataset ID]
            H[Dataset IDs by Map Creator]
            I[Maps Created by Map Creator]
        end

        subgraph Contract Functions
            J[constructor]
            K[initMap]
            L[createAndFundMap]
            M[distributeReward]
            N[setRewardKeyAddress]
            O[mapCreatorWithdrawFundsOfStake]
            P[mapCreatorWithdrawOfSubMaps]
        end

        A -->|Deploys Contract| J
        J -->|Initializes Contract State| E
        B -->|Calls initMap| K
        K -->|Stores Map Info| F
        B -->|Calls createAndFundMap| L
        L -->|Stores Sub Map Info| G
        B -->|Sets Reward Manager| N
        B -->|Calls distributeReward| M
        M -->|Distributes Rewards to Players| D
        B -->|Calls mapCreatorWithdrawFundsOfStake| O
        O -->|Withdraws Staked Funds| B
        B -->|Calls mapCreatorWithdrawOfSubMaps| P
        P -->|Withdraws Remaining Rewards| B

        E --> F
        F --> G
        G --> H
        H --> I
```