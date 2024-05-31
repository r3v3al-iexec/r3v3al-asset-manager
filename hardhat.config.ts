import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    bellecour: {
        chainId: 134,
        url: 'https://bellecour.iex.ec',
        accounts: [process.env.PVK_KEY],
    },
  },
  etherscan: {
    apiKey: {
      bellecour: "abc"
    },
    customChains: [
      {
        network: "bellecour",
        chainId: 134,
        urls: {
          apiURL: "https://blockscout-v6.bellecour.iex.ec/api",
          browserURL: "https://blockscout-v6.bellecour.iex.ec"
        }
      }
    ]
  }
};

export default config;
