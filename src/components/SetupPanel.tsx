import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const PRIMARY = "cta rounded-full px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.16em] transition hover:brightness-110 disabled:opacity-40";
const GHOST = "rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[12px] uppercase tracking-[0.14em] text-white/80 transition hover:border-white/20 hover:bg-white/[0.08] disabled:opacity-30";
const FIELD = "w-24 rounded-lg border border-white/[0.07] bg-white/[0.04] px-2.5 py-1.5 text-sm tabular-nums text-white focus:border-brand focus:outline-none";

const DEFAULT_VALORANT_RANKS: { rank: string; floor: number }[] = [
  { rank: "Immortal", floor: 12 },
  { rank: "Ascendant", floor: 10 },
  { rank: "Diamond", floor: 8 },
  { rank: "Platinum", floor: 6 },
  { rank: "Gold", floor: 4 },
  { rank: "Silver", floor: 2 },
  { rank: "Bronze", floor: 1 },
  { rank: "Iron", floor: 1 },
];

// Hand-picked, well-separated solid hues (not systematically stepped shades) so
// no two swatches read as "basically the same color" at a glance.
const TEAM_COLORS = [
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Yellow
  "#84cc16", // Lime
  "#10b981", // Emerald
  "#14b8a6", // Teal
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#d946ef", // Fuchsia
  "#ec4899", // Pink
  "#f43f5e", // Rose
  "#a3e635", // Chartreuse
];

function fallbackColorFor(teamId: string): string {
  let hash = 0;
  for (let i = 0; i < teamId.length; i++) {
    hash = teamId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TEAM_COLORS[Math.abs(hash) % TEAM_COLORS.length];
}

/** HSL -> hex, kept vivid/dark-bg-friendly at fixed saturation/lightness. */
function hslToHex(h: number, s: number, l: number): string {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Generates an effectively unlimited sequence of visually distinct colors by
 * walking the hue wheel in golden-angle steps, so neighboring indexes never
 * look similar even as the count grows past the curated 8-swatch palette.
 */
function distinctColor(index: number): string {
  const hue = (index * 137.508) % 360;
  return hslToHex(hue, 65, 55);
}

/** Tier accent dots for the rank-points editor. */
const RANK_DOT: Record<string, string> = {
  Immortal: "#b45e6b",
  Ascendant: "#22c55e",
  Diamond: "#b794f4",
  Platinum: "#5eead4",
  Gold: "#f6c177",
  Silver: "#cbd5e1",
  Bronze: "#b08d57",
  Iron: "#8a8f98",
};

const ROLE_LABEL: Record<string, string> = {
  captain: "Captain",
  co_captain: "Co-Captain",
  player: "Player",
};

function rosterRows(teams: any[]): { team: string; name: string; role: string; rank: string; phone: string; price: string }[] {
  const rows: { team: string; name: string; role: string; rank: string; phone: string; price: string }[] = [];
  for (const t of teams ?? []) {
    for (const p of t.roster ?? []) {
      rows.push({
        team: t.name,
        name: p.name ?? "",
        role: ROLE_LABEL[p.role] ?? p.role ?? "",
        rank: p.rank ?? "",
        phone: p.phone ?? "",
        price: p.price != null ? String(p.price) : "-",
      });
    }
  }
  return rows;
}

function downloadBlob(filename: string, mime: string, content: BlobPart) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadRosterCsv(teams: any[], tournamentName: string) {
  const header = ["Team", "Player", "Role", "Rank", "Phone", "Sold For"];
  const lines = [header, ...rosterRows(teams).map((r) => [r.team, r.name, r.role, r.rank, r.phone, r.price])]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  downloadBlob(`${tournamentName || "roster"}.csv`, "text/csv;charset=utf-8", lines);
}

function downloadRosterPdf(teams: any[], tournamentName: string) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(`${tournamentName || "Auction"} — Final Rosters`, 14, 16);

  let y = 24;
  for (const t of teams ?? []) {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(11);
    doc.text(`${t.name} (${t.rosterCount}/${t.rosterSize})`, 14, y);
    autoTable(doc, {
      startY: y + 3,
      head: [["Player", "Role", "Rank", "Phone", "Sold For"]],
      body: (t.roster ?? []).map((p: any) => [
        p.name ?? "",
        ROLE_LABEL[p.role] ?? p.role ?? "",
        p.rank ?? "",
        p.phone ?? "",
        p.price != null ? String(p.price) : "-",
      ]),
      theme: "grid",
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  doc.save(`${tournamentName || "roster"}.pdf`);
}

/** Pre-auction config: editable settings + publish-to-main-site. */
export function SetupPanel({ state, actions }: { state: any; actions: any }) {
  const [ts, setTs] = useState<number>(state?.settings?.timerSeconds ?? 15);
  const [inc, setInc] = useState<number>(state?.settings?.minBidIncrement ?? 1);
  const [ranks, setRanks] = useState<{ rank: string; floor: number }[]>(() => {
    const raw = Array.isArray(state?.rankTable) && state.rankTable.length ? state.rankTable : DEFAULT_VALORANT_RANKS;
    return raw.filter((r: any) => r.rank.toLowerCase().trim() !== "unranked");
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmPub, setConfirmPub] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [colorPickerFor, setColorPickerFor] = useState<string | null>(null);

  async function autoAssignColors() {
    if (!state?.teams?.length) return;
    setAutoAssigning(true);
    setMsg(null);
    try {
      const used = new Set<string>();
      let generatedIndex = 0;
      const nextGenerated = () => {
        let c = distinctColor(generatedIndex++);
        while (used.has(c)) c = distinctColor(generatedIndex++);
        return c;
      };

      for (let i = 0; i < state.teams.length; i++) {
        const t = state.teams[i];
        const current = t.color || fallbackColorFor(t.id);
        // Keep a team's existing color if it's still unique; only reassign clashes/unset.
        // Curated swatches first (they're what you can also pick by hand), then an
        // unlimited generated sequence once those 8 run out — never repeats.
        const next = !used.has(current) ? current : TEAM_COLORS.find((c) => !used.has(c)) ?? nextGenerated();
        used.add(next);
        if (next !== t.color) {
          const r = await actions.setTeamColor(t.id, next);
          if (r?.error) {
            setMsg(r.error);
            return;
          }
        }
      }
      setMsg("✓ colors assigned");
    } finally {
      setAutoAssigning(false);
    }
  }

  // Sync state with incoming props changes (e.g. from server updates)
  useEffect(() => {
    if (state?.settings?.timerSeconds !== undefined) {
      setTs(state.settings.timerSeconds);
    }
    if (state?.settings?.minBidIncrement !== undefined) {
      setInc(state.settings.minBidIncrement);
    }
    if (Array.isArray(state?.rankTable) && state.rankTable.length) {
      setRanks(state.rankTable.filter((r: any) => r.rank.toLowerCase().trim() !== "unranked"));
    }
  }, [state?.settings?.timerSeconds, state?.settings?.minBidIncrement, state?.rankTable]);

  const act = (fn: () => Promise<{ error?: string }>) => async () => {
    setMsg(null);
    const r = await fn();
    setMsg(r?.error ?? "✓ saved");
  };

  return (
    <div className="panel p-5">
      <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.28em] text-white/40">Settings</p>

      <div className="flex flex-wrap items-end gap-4">
        <label className="text-xs text-white/55">
          Timer (s)
          <input
            type="number"
            min={3}
            max={600}
            value={ts === 0 ? "" : ts}
            placeholder="0"
            onChange={(e) => {
              const val = e.target.value;
              setTs(val === "" ? 0 : Number(val));
            }}
            className={`${FIELD} mt-1 block`}
          />
        </label>
        
        <label className="text-xs text-white/55">
          Min Bid Increment
          <input
            type="number"
            min={1}
            value={inc === 0 ? "" : inc}
            placeholder="1"
            onChange={(e) => {
              const val = e.target.value;
              setInc(val === "" ? 0 : Number(val));
            }}
            className={`${FIELD} mt-1 block`}
          />
        </label>

        <div className="text-xs text-white/40">
          Roster size
          <span className="mt-1 block rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-sm tabular-nums text-white/70">
            {state?.settings?.rosterSize ?? "—"}
          </span>
        </div>
        <button className={PRIMARY} onClick={act(() => actions.updateSettings({ timerSeconds: ts, minBidIncrement: inc }))}>
          Save
        </button>
      </div>

      <p className="mt-3 text-[11px] text-white/30">
        Roster size (captain + co-captains + drafted players) is set on the main site. Player floor prices are edited in the table below.
      </p>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
        <div>
          <p className="text-xs font-semibold text-white/80">Safe-max: core slots only</p>
          <p className="mt-0.5 text-[11px] text-white/35">
            {state?.settings?.safeMaxCoreOnly
              ? "On — once a team fills 4 of 5 core slots, safe-max stops reserving for subs so they can go all-in."
              : "Off — safe-max reserves budget for every open slot, subs included (original behavior)."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={!!state?.settings?.safeMaxCoreOnly}
          onClick={act(() => actions.updateSettings({ safeMaxCoreOnly: !state?.settings?.safeMaxCoreOnly }))}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
            state?.settings?.safeMaxCoreOnly ? "bg-brand" : "bg-white/15"
          }`}
        >
          <span
            className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              state?.settings?.safeMaxCoreOnly ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {state?.game === "VALORANT" && (
        <div className="mt-5 border-t border-white/[0.06] pt-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/35">Rank Points</p>
            <button className={GHOST} onClick={() => setRanks(DEFAULT_VALORANT_RANKS)}>Reset</button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {ranks.map((row, i) => (
              <div
                key={row.rank}
                className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 transition-colors focus-within:border-brand/50 focus-within:bg-white/[0.04]"
              >
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: RANK_DOT[row.rank] ?? "#6b7280" }} />
                  <span className="text-[11px] font-medium text-white/70">{row.rank}</span>
                </div>
                <input
                  type="number"
                  min={0}
                  aria-label={`${row.rank} points`}
                  value={row.floor === 0 ? "" : row.floor}
                  placeholder="0"
                  onChange={(e) => {
                    const val = e.target.value;
                    const num = val === "" ? 0 : Number(val);
                    setRanks(ranks.map((r, j) => (j === i ? { ...r, floor: num } : r)));
                  }}
                  className="mt-2 w-full rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-sm font-mono tabular-nums text-white focus:border-brand focus:outline-none"
                />
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button className={PRIMARY} onClick={act(() => actions.setRankTable(ranks))}>Save rank points</button>
          </div>
          <p className="mt-2 text-[11px] text-white/30">
            Re-floors every player still in the pool. Sold players keep their price.
          </p>
        </div>
      )}

      <div className="mt-5 border-t border-white/[0.06] pt-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/35">Team Colors</p>
          {state?.teams?.length > 1 ? (
            <button
              type="button"
              disabled={autoAssigning}
              onClick={autoAssignColors}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-white/70 transition hover:border-white/20 hover:bg-white/[0.08] disabled:opacity-30"
            >
              {autoAssigning ? "Assigning..." : "Auto-assign unique colors"}
            </button>
          ) : null}
        </div>
        {!state?.teams || state.teams.length === 0 ? (
          <p className="text-xs text-white/30 italic">No teams registered.</p>
        ) : (
          (() => {
            // Colors already claimed by OTHER teams, so a clash is visible before you pick.
            const colorOwners = new Map<string, string>();
            for (const t of state.teams) {
              const c = t.color || fallbackColorFor(t.id);
              if (!colorOwners.has(c)) colorOwners.set(c, t.name);
            }

            return (
              <div className="grid grid-cols-1 gap-x-8 gap-y-1 select-none sm:grid-cols-2">
                {state.teams.map((t: any) => {
                  const activeColor = t.color || fallbackColorFor(t.id);
                  const isOpen = colorPickerFor === t.id;

                  return (
                    <div key={t.id} className="relative flex items-center justify-between gap-3 py-1.5 border-b border-white/[0.02] last:border-0">
                      <span className="min-w-0 truncate text-xs font-semibold text-white/80" title={t.name}>{t.name}</span>
                      <button
                        type="button"
                        onClick={() => setColorPickerFor(isOpen ? null : t.id)}
                        className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] py-1 pl-1 pr-2.5 transition hover:border-white/20"
                      >
                        <span className="h-4 w-4 rounded-full border border-black/30" style={{ backgroundColor: activeColor }} />
                        <span className="text-[10px] text-white/40">Edit</span>
                      </button>

                      {isOpen ? (
                        <>
                          {/* Click-outside catcher */}
                          <div className="fixed inset-0 z-10" onClick={() => setColorPickerFor(null)} />
                          <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-xl border border-white/10 bg-[#0b1120] p-3 shadow-xl">
                            <div className="grid grid-cols-7 gap-1.5">
                              {TEAM_COLORS.map((c) => {
                                const isActive = activeColor === c;
                                const usedByOther = !isActive && colorOwners.get(c) && colorOwners.get(c) !== t.name;
                                return (
                                  <button
                                    key={c}
                                    type="button"
                                    title={usedByOther ? `Already used by ${colorOwners.get(c)}` : undefined}
                                    onClick={act(async () => {
                                      const r = await actions.setTeamColor(t.id, c);
                                      setColorPickerFor(null);
                                      return r;
                                    })}
                                    className="relative h-5 w-5 rounded-full border transition-all hover:scale-110 cursor-pointer"
                                    style={{
                                      backgroundColor: c,
                                      borderColor: isActive ? "#000000" : "rgba(255,255,255,0.15)",
                                      borderWidth: isActive ? "2px" : "1px",
                                      boxShadow: isActive ? "0 0 0 2px #ffffff" : "none",
                                      opacity: usedByOther ? 0.35 : 1,
                                    }}
                                  >
                                    {usedByOther ? (
                                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white/90">✕</span>
                                    ) : null}
                                  </button>
                                );
                              })}
                            </div>
                            <label className="mt-2.5 flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-[10px] text-white/50 cursor-pointer hover:border-white/20">
                              <span
                                className="h-4 w-4 shrink-0 rounded-full border border-black/30"
                                style={{ backgroundColor: !TEAM_COLORS.includes(activeColor) ? activeColor : "rgba(255,255,255,0.08)" }}
                              />
                              Custom color
                              <input
                                type="color"
                                value={activeColor.startsWith("#") ? activeColor : "#06b6d4"}
                                onChange={async (e) => {
                                  const customColor = e.target.value;
                                  setMsg(null);
                                  const r = await actions.setTeamColor(t.id, customColor);
                                  setMsg(r?.error ?? "✓ saved");
                                }}
                                onBlur={() => setColorPickerFor(null)}
                                className="sr-only"
                              />
                            </label>
                          </div>
                        </>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            );
          })()
        )}
      </div>

      <div className="mt-5 border-t border-white/[0.06] pt-4">
        <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-white/35">Finalize</p>
        {state?.settings?.finalized ? (
          confirmPub ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-white/60">Publish current rosters to the main site?</span>
              <button className={PRIMARY} onClick={act(async () => { const r = await actions.publishResults(); setConfirmPub(false); return r; })}>Confirm publish</button>
              <button className={GHOST} onClick={() => setConfirmPub(false)}>Cancel</button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button className={PRIMARY} onClick={() => setConfirmPub(true)}>Publish to main site</button>
              <button className={GHOST} onClick={() => downloadRosterCsv(state.teams ?? [], state.tournamentName)}>
                Download CSV
              </button>
              <button className={GHOST} onClick={() => downloadRosterPdf(state.teams ?? [], state.tournamentName)}>
                Download PDF
              </button>
            </div>
          )
        ) : (
          <div className="space-y-2">
            <button className={PRIMARY} onClick={act(() => actions.saveAuction())}>Save Auction</button>
            <p className="text-[11px] text-white/30">
              Locks in the auction. After saving you can publish results, but the auction can no longer be reset.
            </p>
          </div>
        )}
      </div>

      {!state?.settings?.finalized && (
        <div className="mt-5 border-t border-white/[0.06] pt-4">
          <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-white/35">Danger zone</p>
          {confirmReset ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-white/60">Reset the auction? All sold players return to pool and team budgets reset.</span>
              <button className={GHOST} onClick={act(async () => { const r = await actions.resetAuction(); setConfirmReset(false); return r; })}>Confirm reset</button>
              <button className={GHOST} onClick={() => setConfirmReset(false)}>Cancel</button>
            </div>
          ) : (
            <button className={GHOST} onClick={() => setConfirmReset(true)}>Reset Auction</button>
          )}
        </div>
      )}

      {msg && <p className={`mt-3 text-sm ${msg.startsWith("✓") ? "text-brand" : "text-magenta"}`}>{msg}</p>}
    </div>
  );
}

export default SetupPanel;
