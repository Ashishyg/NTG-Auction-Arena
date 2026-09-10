import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_VALORANT_POOL,
  applyAction,
  buildTurnOrder,
  deciderMap,
  isComplete,
  minPoolSize,
  remainingMaps,
  vetoResult,
  type VetoFormat,
  type VetoState,
} from "./rules.ts";

/* Run with:  node --import tsx --test src/veto/rules.test.ts  */

function freshState(format: VetoFormat): VetoState {
  return {
    format,
    pool: [...DEFAULT_VALORANT_POOL],
    turnOrder: buildTurnOrder(format, DEFAULT_VALORANT_POOL.length),
    currentTurn: 0,
    actions: [],
  };
}

/** Drive a veto to completion, always taking the first legal map. */
function playOut(state: VetoState): VetoState {
  let s = state;
  let guard = 0;
  while (!isComplete(s) && guard++ < 50) {
    const turn = s.turnOrder[s.currentTurn];
    const res =
      turn.kind === "side"
        ? applyAction(s, { team: turn.team, side: "attack" })
        : applyAction(s, { team: turn.team, map: remainingMaps(s)[0] });
    assert.ok(res.ok, `turn ${s.currentTurn} rejected: ${res.ok ? "" : res.error}`);
    s = res.state;
  }
  return s;
}

/* ------------------------------- turn order ------------------------------ */

test("team A always moves first", () => {
  for (const f of ["BO1", "BO3", "BO5"] as const) {
    assert.equal(buildTurnOrder(f)[0].team, "A", f);
  }
});

test("BO1 bans six of seven maps", () => {
  const bans = buildTurnOrder("BO1").filter((t) => t.kind === "ban");
  assert.equal(bans.length, 6);
});

test("BO3 picks two maps and bans four, leaving a decider", () => {
  const order = buildTurnOrder("BO3");
  assert.equal(order.filter((t) => t.kind === "pick").length, 2);
  assert.equal(order.filter((t) => t.kind === "ban").length, 4);
});

test("BO5 picks four maps and bans two, leaving a decider", () => {
  const order = buildTurnOrder("BO5");
  assert.equal(order.filter((t) => t.kind === "pick").length, 4);
  assert.equal(order.filter((t) => t.kind === "ban").length, 2);
});

test("BO3 bans twice before the picks, BO5 bans everything first", () => {
  const bo3 = buildTurnOrder("BO3").findIndex((t) => t.kind === "pick");
  assert.equal(bo3, 2);
  const bo5 = buildTurnOrder("BO5").findIndex((t) => t.kind === "pick");
  assert.equal(bo5, 2);
});

test("every pick is followed by the other team choosing a side", () => {
  for (const f of ["BO3", "BO5"] as const) {
    const order = buildTurnOrder(f);
    order.forEach((turn, i) => {
      if (turn.kind !== "pick") return;
      const next = order[i + 1];
      assert.equal(next?.kind, "side", `${f} pick at ${i} has no side turn`);
      assert.notEqual(next.team, turn.team, `${f} same team picked its own side`);
    });
  }
});

test("sequences adapt to a pool that is not seven maps", () => {
  for (const size of [4, 5, 6, 7, 9]) {
    for (const f of ["BO1", "BO3", "BO5"] as const) {
      if (size < minPoolSize(f)) continue;
      const order = buildTurnOrder(f, size);
      const consumed =
        order.filter((t) => t.kind === "ban").length +
        order.filter((t) => t.kind === "pick").length;
      // Everything except the single decider gets banned or picked.
      assert.equal(consumed, size - 1, `${f} on ${size} maps`);
    }
  }
});

/* ------------------------------ turn guards ------------------------------ */

test("acting out of turn is rejected", () => {
  const s = freshState("BO1");
  const res = applyAction(s, { team: "B", map: "Ascent" });
  assert.equal(res.ok, false);
});

test("a map cannot be banned twice", () => {
  const s = freshState("BO1");
  const first = applyAction(s, { team: "A", map: "Ascent" });
  assert.ok(first.ok);
  const again = applyAction(first.state, { team: "B", map: "Ascent" });
  assert.equal(again.ok, false);
});

test("a side turn requires attack or defence", () => {
  let s = freshState("BO1");
  s = playOutBans(s);
  const res = applyAction(s, { team: "A", map: "Ascent" });
  assert.equal(res.ok, false);
});

function playOutBans(state: VetoState): VetoState {
  let s = state;
  while (s.turnOrder[s.currentTurn]?.kind === "ban") {
    const turn = s.turnOrder[s.currentTurn];
    const res = applyAction(s, { team: turn.team, map: remainingMaps(s)[0] });
    assert.ok(res.ok);
    s = res.state;
  }
  return s;
}

/* -------------------------------- outcomes ------------------------------- */

test("BO1 ends with exactly one map", () => {
  const s = playOut(freshState("BO1"));
  assert.ok(isComplete(s));
  assert.equal(remainingMaps(s).length, 1);
  assert.equal(vetoResult(s)?.maps.length, 1);
});

test("BO3 ends with three maps in play order", () => {
  const s = playOut(freshState("BO3"));
  assert.ok(isComplete(s));
  const result = vetoResult(s);
  assert.equal(result?.maps.length, 3);
  // Two were picked by a team, the decider by neither.
  assert.equal(result?.maps.filter((m) => m.pickedBy !== null).length, 2);
  assert.equal(result?.maps.at(-1)?.pickedBy, null);
});

test("every map in the result carries a side", () => {
  const s = playOut(freshState("BO3"));
  for (const m of vetoResult(s)!.maps) {
    assert.ok(m.side === "attack" || m.side === "defence", `${m.map} has no side`);
  }
});

test("the decider is the last map standing", () => {
  const s = playOut(freshState("BO1"));
  assert.equal(vetoResult(s)?.maps[0].map, deciderMap(s));
});

test("no result until the veto is complete", () => {
  assert.equal(vetoResult(freshState("BO3")), null);
});

test("each side is credited to the team that chose it, not the map's picker", () => {
  for (const format of ["BO3", "BO5"] as const) {
    for (const m of vetoResult(playOut(freshState(format)))!.maps) {
      if (m.pickedBy) assert.equal(m.sideBy, m.pickedBy === "A" ? "B" : "A", `${format} ${m.map}`);
      else assert.equal(m.sideBy, "A", `${format}: the decider's side goes to team A`);
    }
  }
});
