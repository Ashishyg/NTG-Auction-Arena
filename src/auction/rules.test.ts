import { test } from "node:test";
import assert from "node:assert/strict";
import { cheapestAvailableFloor, safeMaxBid, validateBid, type ValidateBidArgs } from "./rules.ts";

/* Run with:  npm test  */

/* -------------------------- cheapestAvailableFloor ---------------------- */

test("cheapestAvailableFloor returns the minimum floor", () => {
  assert.equal(cheapestAvailableFloor([12, 5, 8]), 5);
});

test("cheapestAvailableFloor is 0 when nothing remains", () => {
  assert.equal(cheapestAvailableFloor([]), 0);
});

/* ----------------------------- safeMaxBid ------------------------------- */

test("safeMaxBid reserves nothing on a team's last open slot", () => {
  assert.equal(safeMaxBid({ currentBudget: 80, openSlots: 1, cheapestFloor: 5 }), 80);
});

test("safeMaxBid reserves (openSlots-1) * cheapestFloor", () => {
  assert.equal(safeMaxBid({ currentBudget: 100, openSlots: 3, cheapestFloor: 5 }), 90);
});

test("safeMaxBid never reserves for negative slot counts", () => {
  assert.equal(safeMaxBid({ currentBudget: 60, openSlots: 0, cheapestFloor: 5 }), 60);
});

test("safeMaxBid drops as the cheapest available floor rises (dynamic reserve)", () => {
  const base = { currentBudget: 100, openSlots: 3 };
  assert.equal(safeMaxBid({ ...base, cheapestFloor: 5 }), 90);
  assert.equal(safeMaxBid({ ...base, cheapestFloor: 12 }), 76);
});

/* ----------------------------- validateBid ------------------------------ */

const ok: ValidateBidArgs = {
  auctionStatus: "live",
  amount: 10,
  currentPrice: 5,
  minIncrement: 1,
  teamIsHighestBidder: false,
  openSlots: 2,
  currentBudget: 100,
  cheapestFloor: 5,
};

test("validateBid accepts a clean bid", () => {
  assert.deepEqual(validateBid(ok), { ok: true });
});

test("validateBid rejects when bidding is not open", () => {
  assert.equal(validateBid({ ...ok, auctionStatus: "showcase" }).ok, false);
});

test("validateBid rejects a non-finite or non-positive amount", () => {
  assert.equal(validateBid({ ...ok, amount: NaN }).ok, false);
  assert.equal(validateBid({ ...ok, amount: 0 }).ok, false);
  assert.equal(validateBid({ ...ok, amount: -5 }).ok, false);
});

test("validateBid enforces the minimum increment", () => {
  assert.equal(validateBid({ ...ok, amount: 5 }).ok, false);
  assert.equal(validateBid({ ...ok, amount: 6 }).ok, true);
});

test("validateBid blocks the team that is already top bidder", () => {
  assert.equal(validateBid({ ...ok, teamIsHighestBidder: true }).ok, false);
});

test("validateBid blocks a team with no open slots", () => {
  assert.equal(validateBid({ ...ok, openSlots: 0 }).ok, false);
});

test("validateBid blocks a bid above the safe maximum", () => {
  const params = { ...ok, currentBudget: 50, openSlots: 3, cheapestFloor: 10, currentPrice: 1 };
  assert.equal(validateBid({ ...params, amount: 31 }).ok, false);
  assert.equal(validateBid({ ...params, amount: 30 }).ok, true);
});

test("validateBid allows spending the entire budget on a final slot", () => {
  const params = { ...ok, currentBudget: 42, openSlots: 1, cheapestFloor: 5, currentPrice: 1 };
  assert.equal(validateBid({ ...params, amount: 42 }).ok, true);
  assert.equal(validateBid({ ...params, amount: 43 }).ok, false);
});
