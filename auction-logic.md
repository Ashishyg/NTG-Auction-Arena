# Auction Logic — extracted from ntg_auc_cup

Just the auction logic — no UI, no deploy scripts, no analytics/seed/CSV. The
**server is the single source of truth**: it owns the state machine, the
countdown timer, and bid validation. Clients only render.

## Files

| File | What it is | Depends on |
|------|-----------|------------|
| `rules.js` | **Pure** bid maths: `cheapestAvailableFloor` (min of a list), `safeMaxBid`, `validateBid`. No infra. Unit-tested. | nothing |
| `rules.test.js` | `node --test` for the pure rules. | rules.js |
| `rules.db.js` | DB wrapper: re-exports the pure rules + a Mongoose `cheapestAvailableFloor(tournamentId)`. The engine imports this. | Player model |
| `engine.js` | The live auction: state machine, server timer, **atomic bid apply**, undo, pause/resume, pass-2 re-auction, boot recovery, Socket.io wiring. | models, rules.db, **auth.js** |
| `models/*.js` | Mongoose schemas the engine reads/writes. Trimmed to auction-relevant fields. | mongoose |
| `useAuction.js` | React hook: render-only client mirror, auto-resync on reconnect, action emitters. | react, socket.io-client |

## The logic, in one screen

1. **State machine** (`AuctionState.status`): `idle → showcase → live → paused → idle`.
   - `selectPlayer` draws a random pool player → `showcase`.
   - `startAuction` opens bidding, sets `timerEndsAt`, arms the server timer → `live`.
   - Timer fires (or auctioneer `hammer`s) → `finalizeSale` → back to `idle`.
2. **Dynamic reserve**: a team's `safeMax = currentBudget − (openSlots−1) × cheapestFloor`.
   `cheapestFloor` is the cheapest still-winnable player's floor, so the cap
   tightens automatically as cheap players sell. A captain can never be left
   unable to fill its remaining slots.
3. **Atomic bids**: validate with `validateBid`, then apply via
   `findOneAndUpdate({ status:'live', currentPrice:{ $lt: amount } }, …)`. Two
   simultaneous bids → one wins, the other gets "price moved, re-bid". A
   successful bid resets the timer.
4. **Crash recovery**: state is persisted, so `resumeTimers()` on boot re-arms
   any auction that was live (or finalizes it if its time already elapsed).
5. **Pass 2**: unsold players (no bids) are re-auctioned via `selectPlayer(2)`.

## Two things YOU must supply

1. **`auth.js`** exporting `accountFromToken(token) -> { role, team, ... } | null`.
   The engine authenticates each socket from its handshake token and checks
   `role` (`auctioneer`/`admin` control; `captain` bids). Wire it to your auth.
2. **A Socket.io server**, then call `initAuctionEngine(io)` once at startup:

   ```js
   import { Server } from 'socket.io';
   import { initAuctionEngine } from './auction/engine.js';
   const io = new Server(httpServer, { cors: { origin: '*' } });
   initAuctionEngine(io);
   ```

   Client side: `useAuction(tournamentId, token, apiBase)`.

You also need an `AuctionState` doc per tournament (create one when the auction
starts) and Player/Team/Tournament docs populated.

## Test

```
cd auction && node --test
```

---

# Source

## `rules.js` — pure bid maths

```js
/**
 * Pure auction-rule logic — the money/safety core, extracted from ntg_auc_cup.
 *
 * No database, no transport, no framework. Feed it plain numbers, get a
 * decision back. Wire these into whatever engine/DB/socket layer you build:
 * the engine validates with `validateBid` BEFORE applying a bid atomically.
 *
 * The three rules:
 *  - cheapestFloor : the dynamic reserve price (the cheapest still-winnable
 *    player's floor). It RISES automatically as cheap players sell, which is
 *    what keeps `safeMaxBid` honest late in the auction.
 *  - safeMaxBid    : most a team may bid now without leaving itself unable to
 *    fill its remaining roster slots.
 *  - validateBid   : the single place a bid's legality is decided.
 */

/**
 * The cheapest floor price among players still available to be won (pool or
 * on the block). Pure version: pass the floor prices of available players.
 *
 * @param {number[]} availableFloorPrices floors of players still winnable
 * @returns {number} cheapest floor, or 0 if none remain.
 */
export function cheapestAvailableFloor(availableFloorPrices) {
  if (!availableFloorPrices || availableFloorPrices.length === 0) return 0;
  return Math.min(...availableFloorPrices);
}

/**
 * The most a team may safely bid right now without stranding its remaining
 * roster slots.
 *
 *   safeMax = currentBudget - (openSlots - 1) * cheapestFloor
 *
 * Winning the current player fills one slot, so only (openSlots - 1) slots
 * still need reserving. On the last slot nothing is reserved → whole budget.
 *
 * @returns {number} the highest legal bid amount for this team.
 */
export function safeMaxBid({ currentBudget, openSlots, cheapestFloor }) {
  const slotsLeftAfterThisWin = Math.max(openSlots - 1, 0);
  const reserve = slotsLeftAfterThisWin * cheapestFloor;
  return currentBudget - reserve;
}

/**
 * Validates a proposed bid against every auction rule. Returns
 * { ok: true } or { ok: false, reason }. Call this, then — if ok — apply the
 * bid with a conditional/atomic update so two simultaneous bids can't corrupt
 * the price (one wins, the loser is told to re-bid).
 */
export function validateBid({
  auctionStatus,
  amount,
  currentPrice,
  minIncrement,
  teamIsHighestBidder,
  openSlots,
  currentBudget,
  cheapestFloor,
}) {
  if (auctionStatus !== 'live') {
    return { ok: false, reason: 'Bidding is not open right now' };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, reason: 'Invalid bid amount' };
  }
  if (amount < currentPrice + minIncrement) {
    return { ok: false, reason: `Bid must be at least ${currentPrice + minIncrement}` };
  }
  if (teamIsHighestBidder) {
    return { ok: false, reason: 'You are already the highest bidder' };
  }
  if (openSlots <= 0) {
    return { ok: false, reason: 'Your roster is already full' };
  }
  const safeMax = safeMaxBid({ currentBudget, openSlots, cheapestFloor });
  if (amount > safeMax) {
    return {
      ok: false,
      reason: `Bid exceeds your safe maximum of ${safeMax} (credits must be kept to fill your remaining slots)`,
    };
  }
  return { ok: true };
}
```

## `rules.test.js` — `node --test`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cheapestAvailableFloor, safeMaxBid, validateBid } from './rules.js';

/* Run with:  node --test  */

/* -------------------------- cheapestAvailableFloor ---------------------- */

test('cheapestAvailableFloor returns the minimum floor', () => {
  assert.equal(cheapestAvailableFloor([12, 5, 8]), 5);
});

test('cheapestAvailableFloor is 0 when nothing remains', () => {
  assert.equal(cheapestAvailableFloor([]), 0);
  assert.equal(cheapestAvailableFloor(undefined), 0);
});

/* ----------------------------- safeMaxBid ------------------------------- */

test('safeMaxBid reserves nothing on a team\'s last open slot', () => {
  assert.equal(safeMaxBid({ currentBudget: 80, openSlots: 1, cheapestFloor: 5 }), 80);
});

test('safeMaxBid reserves (openSlots-1) * cheapestFloor', () => {
  assert.equal(safeMaxBid({ currentBudget: 100, openSlots: 3, cheapestFloor: 5 }), 90);
});

test('safeMaxBid never reserves for negative slot counts', () => {
  assert.equal(safeMaxBid({ currentBudget: 60, openSlots: 0, cheapestFloor: 5 }), 60);
});

test('safeMaxBid drops as the cheapest available floor rises (dynamic reserve)', () => {
  const base = { currentBudget: 100, openSlots: 3 };
  assert.equal(safeMaxBid({ ...base, cheapestFloor: 5 }), 90);
  assert.equal(safeMaxBid({ ...base, cheapestFloor: 12 }), 76);
});

/* ----------------------------- validateBid ------------------------------ */

const ok = {
  auctionStatus: 'live',
  amount: 10,
  currentPrice: 5,
  minIncrement: 1,
  teamIsHighestBidder: false,
  openSlots: 2,
  currentBudget: 100,
  cheapestFloor: 5,
};

test('validateBid accepts a clean bid', () => {
  assert.deepEqual(validateBid(ok), { ok: true });
});

test('validateBid rejects when bidding is not open', () => {
  assert.equal(validateBid({ ...ok, auctionStatus: 'showcase' }).ok, false);
});

test('validateBid rejects a non-finite or non-positive amount', () => {
  assert.equal(validateBid({ ...ok, amount: NaN }).ok, false);
  assert.equal(validateBid({ ...ok, amount: 0 }).ok, false);
  assert.equal(validateBid({ ...ok, amount: -5 }).ok, false);
});

test('validateBid enforces the minimum increment', () => {
  assert.equal(validateBid({ ...ok, amount: 5 }).ok, false);
  assert.equal(validateBid({ ...ok, amount: 6 }).ok, true);
});

test('validateBid blocks the team that is already top bidder', () => {
  assert.equal(validateBid({ ...ok, teamIsHighestBidder: true }).ok, false);
});

test('validateBid blocks a team with no open slots', () => {
  assert.equal(validateBid({ ...ok, openSlots: 0 }).ok, false);
});

test('validateBid blocks a bid above the safe maximum', () => {
  const params = { ...ok, currentBudget: 50, openSlots: 3, cheapestFloor: 10, currentPrice: 1 };
  assert.equal(validateBid({ ...params, amount: 31 }).ok, false);
  assert.equal(validateBid({ ...params, amount: 30 }).ok, true);
});

test('validateBid allows spending the entire budget on a final slot', () => {
  const params = { ...ok, currentBudget: 42, openSlots: 1, cheapestFloor: 5, currentPrice: 1 };
  assert.equal(validateBid({ ...params, amount: 42 }).ok, true);
  assert.equal(validateBid({ ...params, amount: 43 }).ok, false);
});
```

## `rules.db.js` — DB wrapper

```js
import Player from './models/Player.js';
import { safeMaxBid, validateBid } from './rules.js';

/**
 * DB-coupled wrapper around the pure rules in ./rules.js. The only thing that
 * needs the database is finding the cheapest still-winnable floor price; the
 * actual safe-max and validation maths stay pure and unit-tested in rules.js.
 */

export { safeMaxBid, validateBid };

/**
 * The cheapest floor price among players still available to be won - i.e.
 * still in the pool or currently on the block. Drives the dynamic reserve:
 * once the cheapest players are sold it rises automatically.
 *
 * @returns {number} cheapest floor, or 0 if no players remain.
 */
export async function cheapestAvailableFloor(tournamentId) {
  const cheapest = await Player.find({
    tournament: tournamentId,
    isCore: false,
    status: { $in: ['pool', 'on_auction'] },
  })
    .sort({ floorPrice: 1 })
    .limit(1)
    .lean();

  return cheapest.length ? cheapest[0].floorPrice : 0;
}
```

## `engine.js` — live auction engine

```js
import mongoose from 'mongoose';
import Tournament from './models/Tournament.js';
import Player from './models/Player.js';
import Team from './models/Team.js';
import AuctionState from './models/AuctionState.js';
import { accountFromToken } from './auth.js'; // <-- YOUR token verifier (see top)
import { cheapestAvailableFloor, safeMaxBid, validateBid } from './rules.db.js';

/**
 * The auction engine. Owns the live auction: the state machine, the
 * server-side countdown timer, atomic bid handling and broadcasting.
 *
 * Design rules:
 *  - The SERVER is the single source of truth. Clients only render.
 *  - The TIMER lives here, not on any client. The server decides when a
 *    player is sold. Clients render a countdown from `timerEndsAt`.
 *  - Bids are applied with an ATOMIC conditional update, so two bids landing
 *    at the same instant cannot corrupt the price - one wins, one is told to
 *    re-bid.
 */

// In-memory timer handles, keyed by tournamentId. Not persisted - rebuilt on
// boot from AuctionState (see resumeTimers).
const timers = new Map();

let ioRef = null;

/** Room name all clients of one tournament share. */
const room = (tournamentId) => `auction:${tournamentId}`;

/**
 * Builds the full public auction snapshot sent to clients. Includes per-team
 * budgets/rosters so captains and the observer screen see everything live.
 */
async function buildSnapshot(tournamentId) {
  const [tournament, state, teams, players] = await Promise.all([
    Tournament.findById(tournamentId).lean(),
    AuctionState.findOne({ tournament: tournamentId }).lean(),
    Team.find({ tournament: tournamentId }).lean(),
    Player.find({ tournament: tournamentId }).lean(),
  ]);
  if (!tournament || !state) return null;

  const rosterSize = tournament.settings.rosterSize;
  const cheapestFloor = await cheapestAvailableFloor(tournamentId);

  const currentPlayer = state.currentPlayer
    ? players.find((p) => String(p._id) === String(state.currentPlayer)) || null
    : null;

  const teamView = teams.map((t) => {
    const openSlots = rosterSize - t.roster.length;
    return {
      id: t._id,
      name: t.name,
      currentBudget: t.currentBudget,
      rosterCount: t.roster.length,
      rosterSize,
      openSlots,
      roster: t.roster,
      // The team's safe maximum for the player currently on the block.
      safeMax: safeMaxBid({ currentBudget: t.currentBudget, openSlots, cheapestFloor }),
    };
  });

  return {
    tournamentId,
    status: state.status,
    pass: state.pass,
    settings: {
      minBidIncrement: tournament.settings.minBidIncrement,
      rosterSize,
      timerSeconds: tournament.settings.timerSeconds,
    },
    currentPlayer,
    currentPrice: state.currentPrice,
    highestBidder: state.highestBidder,
    highestBidderName: state.highestBidderName,
    timerEndsAt: state.timerEndsAt,
    bidHistory: state.bidHistory,
    saleLog: state.saleLog.slice(-8), // recent sales ticker
    teams: teamView,
    counts: {
      pool: players.filter((p) => !p.isCore && p.status === 'pool').length,
      sold: players.filter((p) => p.status === 'sold').length,
      unsold: players.filter((p) => p.status === 'unsold').length,
    },
    serverTime: Date.now(), // lets clients correct for clock offset
  };
}

/** Broadcasts the current snapshot to everyone in the tournament room. */
async function broadcast(tournamentId) {
  const snap = await buildSnapshot(tournamentId);
  if (snap) ioRef.to(room(tournamentId)).emit('state', snap);
}

/** Clears any pending sell-timer for a tournament. */
function clearTimer(tournamentId) {
  const handle = timers.get(String(tournamentId));
  if (handle) {
    clearTimeout(handle);
    timers.delete(String(tournamentId));
  }
}

/**
 * Arms the server-side sell timer. When it fires, the player is sold to the
 * current highest bidder (or marked unsold if there were no bids).
 */
function armTimer(tournamentId, msFromNow) {
  clearTimer(tournamentId);
  const handle = setTimeout(() => finalizeSale(tournamentId), msFromNow);
  timers.set(String(tournamentId), handle);
}

/**
 * Concludes the current player's auction. Called by the timer firing or by
 * the auctioneer hammering. Sells to the highest bidder, or marks unsold.
 */
async function finalizeSale(tournamentId) {
  clearTimer(tournamentId);
  const state = await AuctionState.findOne({ tournament: tournamentId });
  if (!state || !['live', 'paused'].includes(state.status)) return;
  if (!state.currentPlayer) return;

  const player = await Player.findById(state.currentPlayer);
  if (!player) return;

  if (state.highestBidder) {
    // SOLD. Deduct credits and add the player to the winning roster.
    const team = await Team.findById(state.highestBidder);
    team.currentBudget -= state.currentPrice;
    team.roster.push(player._id);
    await team.save();

    player.status = 'sold';
    player.soldPrice = state.currentPrice;
    player.currentTeam = team._id;
    await player.save();

    state.saleLog.push({
      player: player._id,
      playerName: player.name,
      team: team._id,
      teamName: team.name,
      price: state.currentPrice,
      at: new Date(),
    });
    ioRef.to(room(tournamentId)).emit('playerSold', {
      playerName: player.name,
      teamName: team.name,
      price: state.currentPrice,
    });
  } else {
    // UNSOLD. No bids - it goes to the pass-2 re-auction pool.
    player.status = 'unsold';
    await player.save();
    ioRef.to(room(tournamentId)).emit('playerUnsold', { playerName: player.name });
  }

  // Reset the block back to idle, ready for the next player.
  state.status = 'idle';
  state.currentPlayer = null;
  state.currentPrice = 0;
  state.highestBidder = null;
  state.highestBidderName = null;
  state.timerEndsAt = null;
  state.pausedRemainingMs = null;
  state.bidHistory = [];
  await state.save();

  await broadcast(tournamentId);
}

/* ------------------------------------------------------------------ */
/* Auctioneer actions                                                  */
/* ------------------------------------------------------------------ */

/** Draws a random player from the pool and puts them in the showcase. */
async function selectPlayer(tournamentId, { pass }) {
  const state = await AuctionState.findOne({ tournament: tournamentId });
  if (!state || state.status !== 'idle') {
    return { error: 'Finish the current player before drawing the next' };
  }

  // Pass 1 draws from 'pool'; pass 2 re-auctions 'unsold' players.
  const drawStatus = pass === 2 ? 'unsold' : 'pool';
  const available = await Player.find({
    tournament: tournamentId,
    isCore: false,
    status: drawStatus,
  }).lean();

  if (!available.length) {
    return { error: pass === 2 ? 'No unsold players remain' : 'The pool is empty' };
  }

  const pick = available[Math.floor(Math.random() * available.length)];
  await Player.findByIdAndUpdate(pick._id, { status: 'on_auction' });

  state.status = 'showcase';
  state.pass = pass || 1;
  state.currentPlayer = pick._id;
  state.currentPrice = pick.floorPrice;
  state.highestBidder = null;
  state.highestBidderName = null;
  state.timerEndsAt = null;
  state.bidHistory = [];
  await state.save();

  await broadcast(tournamentId);
  return { ok: true };
}

/** Opens bidding on the showcased player and arms the timer. */
async function startAuction(tournamentId) {
  const [state, tournament] = await Promise.all([
    AuctionState.findOne({ tournament: tournamentId }),
    Tournament.findById(tournamentId),
  ]);
  if (!state || state.status !== 'showcase') {
    return { error: 'No player is in the showcase' };
  }

  const ms = tournament.settings.timerSeconds * 1000;
  state.status = 'live';
  state.timerEndsAt = new Date(Date.now() + ms);
  await state.save();

  armTimer(tournamentId, ms);
  await broadcast(tournamentId);
  return { ok: true };
}

/** Auctioneer ends the current player early ("hammer"). */
async function hammer(tournamentId) {
  const state = await AuctionState.findOne({ tournament: tournamentId });
  if (!state || state.status !== 'live') return { error: 'Nothing live to hammer' };
  await finalizeSale(tournamentId);
  return { ok: true };
}

/** Pauses a live auction, banking the remaining time. */
async function pause(tournamentId) {
  const state = await AuctionState.findOne({ tournament: tournamentId });
  if (!state || state.status !== 'live') return { error: 'Nothing live to pause' };

  clearTimer(tournamentId);
  state.pausedRemainingMs = Math.max(new Date(state.timerEndsAt).getTime() - Date.now(), 0);
  state.status = 'paused';
  state.timerEndsAt = null;
  await state.save();
  await broadcast(tournamentId);
  return { ok: true };
}

/** Resumes a paused auction with the banked time restored. */
async function resume(tournamentId) {
  const state = await AuctionState.findOne({ tournament: tournamentId });
  if (!state || state.status !== 'paused') return { error: 'Auction is not paused' };

  const ms = state.pausedRemainingMs ?? 0;
  state.status = 'live';
  state.timerEndsAt = new Date(Date.now() + ms);
  state.pausedRemainingMs = null;
  await state.save();

  armTimer(tournamentId, ms);
  await broadcast(tournamentId);
  return { ok: true };
}

/**
 * Undoes the most recent completed sale: refunds the team, frees the roster
 * slot, and returns the player to the pool. Only safe to call while idle
 * (between players).
 */
async function undoLastSale(tournamentId) {
  const state = await AuctionState.findOne({ tournament: tournamentId });
  if (!state) return { error: 'No auction' };
  if (state.status !== 'idle') {
    return { error: 'Finish or hammer the current player before undoing' };
  }
  if (!state.saleLog.length) return { error: 'Nothing to undo' };

  const last = state.saleLog[state.saleLog.length - 1];
  const player = await Player.findById(last.player);

  if (player && player.status === 'sold') {
    const team = await Team.findById(last.team);
    if (team) {
      team.currentBudget += last.price;
      team.roster = team.roster.filter((id) => String(id) !== String(player._id));
      await team.save();
    }
    player.status = 'pool';
    player.soldPrice = null;
    player.currentTeam = null;
    await player.save();
  }

  state.saleLog.pop();
  await state.save();
  await broadcast(tournamentId);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Captain action: bid                                                 */
/* ------------------------------------------------------------------ */

/**
 * Handles a bid from a captain. Validates against all rules, then applies it
 * with an atomic conditional update so simultaneous bids cannot corrupt the
 * price. A successful bid resets the countdown timer.
 */
async function placeBid(tournamentId, teamId, amount) {
  const [tournament, state, team] = await Promise.all([
    Tournament.findById(tournamentId),
    AuctionState.findOne({ tournament: tournamentId }),
    Team.findById(teamId),
  ]);
  if (!tournament || !state || !team) return { error: 'Auction not available' };

  const rosterSize = tournament.settings.rosterSize;
  const openSlots = rosterSize - team.roster.length;
  const cheapestFloor = await cheapestAvailableFloor(tournamentId);

  const check = validateBid({
    auctionStatus: state.status,
    amount,
    currentPrice: state.currentPrice,
    minIncrement: tournament.settings.minBidIncrement,
    teamIsHighestBidder: String(state.highestBidder) === String(teamId),
    openSlots,
    currentBudget: team.currentBudget,
    cheapestFloor,
  });
  if (!check.ok) return { error: check.reason };

  // Atomic apply: only succeeds if the auction is still live AND the price
  // has not moved past what this bid beats. If another bid landed first this
  // update matches nothing and we tell the captain to re-bid.
  const ms = tournament.settings.timerSeconds * 1000;
  const updated = await AuctionState.findOneAndUpdate(
    {
      tournament: tournamentId,
      status: 'live',
      currentPrice: { $lt: amount },
    },
    {
      currentPrice: amount,
      highestBidder: team._id,
      highestBidderName: team.name,
      timerEndsAt: new Date(Date.now() + ms),
      $push: { bidHistory: { team: team._id, teamName: team.name, amount, at: new Date() } },
    },
    { new: true }
  );

  if (!updated) {
    return { error: 'Someone bid first - the price moved. Try again.' };
  }

  // Bid stuck: reset the timer and tell everyone.
  armTimer(tournamentId, ms);
  ioRef.to(room(tournamentId)).emit('bidPlaced', {
    teamName: team.name,
    amount,
  });
  await broadcast(tournamentId);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Boot-time recovery                                                  */
/* ------------------------------------------------------------------ */

/**
 * On server start, re-arm timers for any auction that was live when the
 * process stopped. If the banked time already elapsed, finalize immediately.
 */
async function resumeTimers() {
  const liveStates = await AuctionState.find({ status: 'live' });
  for (const state of liveStates) {
    const msLeft = new Date(state.timerEndsAt).getTime() - Date.now();
    if (msLeft > 0) {
      armTimer(state.tournament, msLeft);
      console.log(`[auction] resumed timer for tournament ${state.tournament}`);
    } else {
      await finalizeSale(state.tournament);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Socket.io wiring                                                     */
/* ------------------------------------------------------------------ */

/**
 * Attaches the auction engine to a Socket.io server. Authenticates each
 * socket from its handshake token and enforces role permissions per action.
 */
export function initAuctionEngine(io) {
  ioRef = io;

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    const account = await accountFromToken(token);
    if (!account) return next(new Error('Authentication required'));
    socket.account = account;
    next();
  });

  io.on('connection', (socket) => {
    const { account } = socket;

    // Join a tournament room and immediately receive the current snapshot.
    socket.on('join', async ({ tournamentId }) => {
      if (!tournamentId) return;
      socket.join(room(tournamentId));
      socket.tournamentId = tournamentId;
      const snap = await buildSnapshot(tournamentId);
      if (snap) socket.emit('state', snap);
    });

    // ---- Auctioneer / admin actions --------------------------------------
    const isController = ['auctioneer', 'admin'].includes(account.role);

    const guard = (fn) => async (payload, ack) => {
      const tournamentId = socket.tournamentId;
      if (!tournamentId) return ack?.({ error: 'Join a tournament first' });
      if (!isController) return ack?.({ error: 'Auctioneer only' });
      try {
        const result = await fn(tournamentId, payload || {});
        ack?.(result);
      } catch (err) {
        console.error('[auction] action failed:', err);
        ack?.({ error: 'Server error - action did not complete' });
      }
    };

    socket.on('selectPlayer', guard((tid, p) => selectPlayer(tid, p)));
    socket.on('startAuction', guard((tid) => startAuction(tid)));
    socket.on('hammer', guard((tid) => hammer(tid)));
    socket.on('pause', guard((tid) => pause(tid)));
    socket.on('resume', guard((tid) => resume(tid)));
    socket.on('undoLastSale', guard((tid) => undoLastSale(tid)));

    // ---- Captain action: bid --------------------------------------------
    socket.on('bid', async ({ amount }, ack) => {
      const tournamentId = socket.tournamentId;
      if (!tournamentId) return ack?.({ error: 'Join a tournament first' });
      if (account.role !== 'captain' || !account.team) {
        return ack?.({ error: 'Only captains can bid' });
      }
      try {
        const result = await placeBid(tournamentId, account.team, Number(amount));
        ack?.(result);
      } catch (err) {
        console.error('[auction] bid failed:', err);
        ack?.({ error: 'Server error - bid did not register' });
      }
    });

    // Lets a reconnecting client pull fresh state on demand.
    socket.on('resync', async (_p, ack) => {
      const snap = socket.tournamentId ? await buildSnapshot(socket.tournamentId) : null;
      ack?.(snap || { error: 'Not in a tournament' });
    });
  });

  resumeTimers().catch((e) => console.error('[auction] resumeTimers failed:', e));
}
```

## `models/AuctionState.js`

```js
import mongoose from 'mongoose';

/**
 * One AuctionState document per tournament - the single live source of truth
 * for the auction. Persisting it means that if the host laptop restarts
 * mid-auction, the engine can resume from exactly where it left off.
 */
const bidSchema = new mongoose.Schema(
  {
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    teamName: { type: String },
    amount: { type: Number },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    playerName: { type: String },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    teamName: { type: String },
    price: { type: Number },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const auctionStateSchema = new mongoose.Schema(
  {
    tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true, unique: true },

    status: {
      type: String,
      enum: ['idle', 'showcase', 'live', 'paused', 'sold'],
      default: 'idle',
    },

    pass: { type: Number, default: 1 }, // 1 = main pass, 2 = unsold re-auction

    currentPlayer: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
    currentPrice: { type: Number, default: 0 },
    highestBidder: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
    highestBidderName: { type: String, default: null },

    // Absolute timestamp the countdown ends. All clients render from this one
    // value so every screen shows the same number. The server, not any
    // client, decides when it has elapsed.
    timerEndsAt: { type: Date, default: null },

    // When paused, how many ms were left - so resume restores the countdown.
    pausedRemainingMs: { type: Number, default: null },

    bidHistory: { type: [bidSchema], default: [] }, // bids on the current player
    saleLog: { type: [saleSchema], default: [] },    // every completed sale, in order
  },
  { timestamps: true }
);

export default mongoose.model('AuctionState', auctionStateSchema);
```

## `models/Player.js`

```js
import mongoose from 'mongoose';

/**
 * A Player belongs to one tournament. Players in the auction pool are bought
 * by teams; cores are attached directly to a team and not auctioned.
 *
 * Trimmed to the fields the auction logic actually reads/writes. The original
 * also carried profile fields (inGameName, rank, role, photoUrl, self-reg
 * account/approval) — add those back if your app needs them.
 */
const playerSchema = new mongoose.Schema(
  {
    tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },

    name: { type: String, required: true },

    floorPrice: { type: Number, required: true },  // auction starting price

    // Auction lifecycle.
    status: {
      type: String,
      enum: ['pending', 'pool', 'on_auction', 'sold', 'unsold'],
      default: 'pool',
      index: true,
    },

    soldPrice: { type: Number, default: null },
    currentTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },

    // Cores are pre-assigned, never auctioned.
    isCore: { type: Boolean, default: false },
    coreOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Player', playerSchema);
```

## `models/Team.js`

```js
import mongoose from 'mongoose';

/**
 * A Team belongs to one tournament. It spends `currentBudget` in the auction
 * to fill `rosterSize` slots. The original also modelled two pre-assigned
 * cores (captain + co-captain) whose rank cost was deducted from the starting
 * budget — kept here as optional fields since the auction maths only needs
 * currentBudget + roster.
 */
const coreSchema = new mongoose.Schema(
  {
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    name: { type: String, required: true },
    rank: { type: String },
    rankCost: { type: Number, default: 0 }, // credits this core costs
  },
  { _id: false }
);

const teamSchema = new mongoose.Schema(
  {
    tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },

    name: { type: String, required: true },

    core1: { type: coreSchema }, // captain (optional)
    core2: { type: coreSchema }, // co-captain (optional)

    startingBudget: { type: Number, required: true },
    coreDeduction: { type: Number, default: 0 },

    // currentBudget = startingBudget - coreDeduction - sum(roster soldPrices).
    // Maintained by the auction engine as players are won / sales undone.
    currentBudget: { type: Number, required: true },

    // The auction picks. Length grows as players are won, up to rosterSize.
    roster: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
  },
  { timestamps: true }
);

// Convenience: how many auction slots are still open.
teamSchema.methods.slotsOpen = function (rosterSize) {
  return rosterSize - this.roster.length;
};

export default mongoose.model('Team', teamSchema);
```

## `models/Tournament.js`

```js
import mongoose from 'mongoose';

/**
 * A Tournament is the top-level container. Every player, team and auction
 * state belongs to exactly one tournament. The auction engine reads its
 * `settings` for budget, roster size, timer length and min bid increment.
 */
const tournamentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    status: {
      type: String,
      enum: ['setup', 'auction', 'matches', 'complete'],
      default: 'setup',
    },

    // Auction / roster settings - configurable per tournament so the economy
    // can differ between events without touching code.
    settings: {
      startingBudget: { type: Number, default: 150 },
      rosterSize: { type: Number, default: 3 },    // auction picks per team (excl. cores)
      teamCount: { type: Number, default: 10 },
      timerSeconds: { type: Number, default: 15 }, // countdown per player
      minBidIncrement: { type: Number, default: 1 },
    },
  },
  { timestamps: true }
);

export default mongoose.model('Tournament', tournamentSchema);
```

## `useAuction.js` — React client mirror

```jsx
import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

/**
 * The single client-side mirror of the server's auction state. Connects an
 * authenticated socket, joins the tournament room, and keeps the latest
 * snapshot. The server is the source of truth — this hook never computes
 * auction outcomes, it only renders what the server sends and forwards actions.
 *
 * On (re)connect it re-joins automatically, so a phone that drops Wi-Fi
 * resyncs the moment it comes back.
 *
 * @param tournamentId  which tournament room to join
 * @param token         auth token (sent in the socket handshake; your server
 *                      verifies it in io.use — see engine.initAuctionEngine)
 * @param apiBase       server URL ('' / undefined = same-origin)
 */
export function useAuction(tournamentId, token, apiBase = '') {
  const socketRef = useRef(null);
  const [state, setState] = useState(null);
  const [connected, setConnected] = useState(false);
  const [clockOffset, setClockOffset] = useState(0); // clientNow - serverNow
  const [events, setEvents] = useState([]); // transient feed (bids/sales)

  const pushEvent = useCallback((e) => {
    setEvents((prev) => [{ id: Date.now() + Math.random(), ...e }, ...prev].slice(0, 30));
  }, []);

  useEffect(() => {
    if (!token || !tournamentId) return undefined;
    const socket = io(apiBase || undefined, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
    });
    socketRef.current = socket;

    const join = () => socket.emit('join', { tournamentId });

    socket.on('connect', () => {
      setConnected(true);
      join(); // also fires on every reconnect → automatic resync
    });
    socket.on('disconnect', () => setConnected(false));

    socket.on('state', (snap) => {
      if (snap?.serverTime) setClockOffset(Date.now() - snap.serverTime);
      setState(snap);
    });
    socket.on('bidPlaced', (e) => pushEvent({ type: 'bid', ...e }));
    socket.on('playerSold', (e) => pushEvent({ type: 'sold', ...e }));
    socket.on('playerUnsold', (e) => pushEvent({ type: 'unsold', ...e }));

    return () => {
      socket.removeAllListeners();
      socket.close();
      socketRef.current = null;
    };
  }, [token, tournamentId, apiBase, pushEvent]);

  // Emit an event and resolve with the server's ack.
  const emit = useCallback(
    (event, payload = {}) =>
      new Promise((resolve) => {
        const socket = socketRef.current;
        if (!socket) return resolve({ error: 'Not connected' });
        socket.emit(event, payload, (ack) => resolve(ack || {}));
      }),
    []
  );

  const actions = {
    bid: (amount) => emit('bid', { amount }),
    selectPlayer: (pass = 1) => emit('selectPlayer', { pass }),
    startAuction: () => emit('startAuction'),
    hammer: () => emit('hammer'),
    pause: () => emit('pause'),
    resume: () => emit('resume'),
    undoLastSale: () => emit('undoLastSale'),
  };

  return { state, connected, clockOffset, events, actions };
}

export default useAuction;
```
