import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const JAN_1ST_2030 = 1893456000;
const ONE_GWEI: bigint = 1_000_000_000n;

const R3v3alManagerModule = buildModule("R3v3alManagerModule", (m) => {
  const unlockTime = m.getParameter("unlockTime", JAN_1ST_2030);
  const lockedAmount = m.getParameter("lockedAmount", ONE_GWEI);

  const R3v3alManager = m.contract("R3v3alManager", [unlockTime], {
    value: lockedAmount,
  });

  return { R3v3alManager };
});

export default R3v3alManagerModule;
