import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { parseEther } from "viem";

const { viem, networkHelpers } = await network.getOrCreate();

const DAY = 24 * 60 * 60;

async function deploy() {
  const [owner, alice] = await viem.getWalletClients();
  const token = await viem.deployContract("StakeToken", [owner.account.address]);
  const vault = await viem.deployContract("StakingVault", [
    token.address,
    owner.account.address,
    BigInt(7 * DAY),
  ]);
  await token.write.mint([alice.account.address, parseEther("1000")]);
  await token.write.approve([vault.address, parseEther("1000")], { account: alice.account });
  return { owner, alice, token, vault };
}

describe("StakingVault v2: early withdrawal fee", () => {
  it("charges no fee when the policy is not configured", async () => {
    const { alice, token, vault } = await deploy();
    await vault.write.stake([parseEther("100")], { account: alice.account });
    await vault.write.withdraw([parseEther("100")], { account: alice.account });
    assert.equal(await token.read.balanceOf([alice.account.address]), parseEther("1000"));
  });

  it("charges the fee to the treasury when withdrawing inside the lock period", async () => {
    const { owner, alice, token, vault } = await deploy();
    await vault.write.setWithdrawalPolicy([BigInt(3 * DAY), 500n]); // 3 days, 5%

    const treasuryBefore = await token.read.balanceOf([owner.account.address]);
    await vault.write.stake([parseEther("100")], { account: alice.account });
    await vault.write.withdraw([parseEther("100")], { account: alice.account });

    assert.equal(await token.read.balanceOf([alice.account.address]), parseEther("995"));
    const treasuryAfter = await token.read.balanceOf([owner.account.address]);
    assert.equal(treasuryAfter - treasuryBefore, parseEther("5"));
  });

  it("charges no fee after the lock period has passed", async () => {
    const { alice, token, vault } = await deploy();
    await vault.write.setWithdrawalPolicy([BigInt(3 * DAY), 500n]);
    await vault.write.stake([parseEther("100")], { account: alice.account });

    await networkHelpers.time.increase(3 * DAY + 1);
    await vault.write.withdraw([parseEther("100")], { account: alice.account });

    assert.equal(await token.read.balanceOf([alice.account.address]), parseEther("1000"));
  });

  it("rejects a fee above the 10% cap", async () => {
    const { vault } = await deploy();
    await assert.rejects(vault.write.setWithdrawalPolicy([BigInt(DAY), 1001n]), /FeeTooHigh/);
  });

  it("only the owner can change the policy or treasury", async () => {
    const { alice, vault } = await deploy();
    await assert.rejects(
      vault.write.setWithdrawalPolicy([BigInt(DAY), 100n], { account: alice.account }),
      /OwnableUnauthorizedAccount/,
    );
    await assert.rejects(
      vault.write.setTreasury([alice.account.address], { account: alice.account }),
      /OwnableUnauthorizedAccount/,
    );
  });
});
