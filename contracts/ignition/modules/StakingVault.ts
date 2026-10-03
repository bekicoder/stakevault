import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseEther } from "viem";

const WEEK = 7n * 24n * 60n * 60n;

export default buildModule("StakingVaultModule", (m) => {
  const owner = m.getAccount(0);

  const token = m.contract("StakeToken", [owner]);
  const vault = m.contract("StakingVault", [token, owner, WEEK]);

  // Fund the first reward period: approve, then notify
  const reward = parseEther("70000");
  const approve = m.call(token, "approve", [vault, reward], { id: "approveRewards" });
  m.call(vault, "notifyRewardAmount", [reward], { after: [approve] });

  return { token, vault };
});
