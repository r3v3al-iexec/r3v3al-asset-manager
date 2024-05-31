import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const LOCK_PERIOD_DAYS = 1;
const COMMUNITY_POOL = "0x1d1661Cb61BF5e3066F17F82099786d0fCc49d46"; // Replace with actual community pool address
const S_STAKE: bigint = 1_000_000_000_000_000_000n; // 1 ETH in wei
const M_STAKE: bigint = 2_000_000_000_000_000_000n; // 2 ETH in wei
const L_STAKE: bigint = 3_000_000_000_000_000_000n; // 3 ETH in wei

const R3v3alfundsModule = buildModule("R3v3alfundsModule", (m) => {
  const lockPeriod = m.getParameter("lockPeriod", LOCK_PERIOD_DAYS);
  const communityPool = m.getParameter("communityPool", COMMUNITY_POOL);
  const sStake = m.getParameter("sStake", S_STAKE);
  const mStake = m.getParameter("mStake", M_STAKE);
  const lStake = m.getParameter("lStake", L_STAKE);

  const r3v3alfunds = m.contract("R3v3alfunds", [lockPeriod, communityPool, sStake, mStake, lStake]);

  return { r3v3alfunds };
});

export default R3v3alfundsModule;
