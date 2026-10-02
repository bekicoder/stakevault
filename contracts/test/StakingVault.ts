import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { parseEther } from "viem";

const { viem, networkHelpers } = await network.getOrCreate();

const DAY = 24 * 60 * 60;
const DURATION = 7 * DAY;

async function deploy() {
  const [owner, alice, bob] = await viem.getWalletClients();
  const token = await viem.deployContract("StakeToken", [owner.account.address]);
  const vault = await viem.deployContract("StakingVault", [
    token.address,
    owner.account.address,
    BigInt(DURATION),
  ]);

  for (const user of [alice, bob]) {
    await token.write.mint([user.account.address, parseEther("1000")]);
    await token.write.approve([vault.address, parseEther("1000")], { account: user.account });
  }
  await token.write.approve([vault.address, parseEther("7000")]);

  return { owner, alice, bob, token, vault };
}

const near = (a: bigint, b: bigint, tol: bigint) => (a > b ? a - b : b - a) <= tol;

describe("StakingVault", () => {
  it("stakes and updates balances", async () => {
    const { alice, token, vault } = await deploy();
    await vault.write.stake([parseEther("100")], { account: alice.account });

    assert.equal(await vault.read.balanceOf([alice.account.address]), parseEther("100"));
    assert.equal(await vault.read.totalStaked(), parseEther("100"));
    assert.equal(await token.read.balanceOf([vault.address]), parseEther("100"));
  });

  it("reverts on zero stake", async () => {
    const { alice, vault } = await deploy();
    await assert.rejects(vault.write.stake([0n], { account: alice.account }), /ZeroAmount/);
  });

  it("reverts when withdrawing more than staked", async () => {
    const { alice, vault } = await deploy();
    await vault.write.stake([parseEther("10")], { account: alice.account });
    await assert.rejects(
      vault.write.withdraw([parseEther("11")], { account: alice.account }),
      /InsufficientBalance/,
    );
  });

  it("streams all rewards to a single staker over the period", async () => {
    const { alice, vault } = await deploy();
    await vault.write.stake([parseEther("100")], { account: alice.account });
    await vault.write.notifyRewardAmount([parseEther("7000")]);

    await networkHelpers.time.increase(DURATION + 10);

    const earned = await vault.read.earned([alice.account.address]);
    assert.ok(near(earned, parseEther("7000"), 1_000_000n), `earned ${earned}`);
  });

  it("splits rewards proportionally between stakers", async () => {
    const { alice, bob, vault } = await deploy();
    await vault.write.stake([parseEther("100")], { account: alice.account });
    await vault.write.stake([parseEther("300")], { account: bob.account });
    await vault.write.notifyRewardAmount([parseEther("7000")]);

    await networkHelpers.time.increase(DURATION + 10);

    const a = await vault.read.earned([alice.account.address]);
    const b = await vault.read.earned([bob.account.address]);
    assert.ok(near(a, parseEther("1750"), parseEther("0.01")), `alice ${a}`);
    assert.ok(near(b, parseEther("5250"), parseEther("0.01")), `bob ${b}`);
  });

  it("pays out rewards on exit", async () => {
    const { alice, token, vault } = await deploy();
    await vault.write.stake([parseEther("100")], { account: alice.account });
    await vault.write.notifyRewardAmount([parseEther("7000")]);
    await networkHelpers.time.increase(DURATION + 10);

    await vault.write.exit({ account: alice.account });

    const bal = await token.read.balanceOf([alice.account.address]);
    assert.ok(bal > parseEther("7999"), `balance ${bal}`); // 1000 start + ~7000 rewards
    assert.equal(await vault.read.balanceOf([alice.account.address]), 0n);
  });

  it("blocks staking while paused but still allows withdrawals", async () => {
    const { alice, vault } = await deploy();
    await vault.write.stake([parseEther("50")], { account: alice.account });
    await vault.write.pause();

    await assert.rejects(vault.write.stake([parseEther("1")], { account: alice.account }), /EnforcedPause/);
    await vault.write.withdraw([parseEther("50")], { account: alice.account });
    assert.equal(await vault.read.balanceOf([alice.account.address]), 0n);
  });

  it("only the owner can fund rewards or pause", async () => {
    const { alice, vault } = await deploy();
    await assert.rejects(
      vault.write.notifyRewardAmount([parseEther("1")], { account: alice.account }),
      /OwnableUnauthorizedAccount/,
    );
    await assert.rejects(vault.write.pause({ account: alice.account }), /OwnableUnauthorizedAccount/);
  });
});
