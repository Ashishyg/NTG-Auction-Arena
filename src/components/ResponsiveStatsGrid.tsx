"use client";

import { useState } from "react";
import { PlayerPoolPanel, UnsoldPanel, TeamsPanel } from "./TeamsPanel";

/** Mobile-only tab switcher for Player Pool / Unsold / Teams, so the live screen
 * doesn't force a long vertical scroll through all three. Recent Sales stays
 * outside this component, rendered separately above it. */
export function PoolUnsoldTeamsTabs({
  poolPlayers,
  poolCount,
  unsoldPlayers,
  unsoldCount,
  teams,
  highlightId,
  editBudget,
  heightClass = "h-[420px]",
}: {
  poolPlayers: any[];
  poolCount: number;
  unsoldPlayers: any[];
  unsoldCount: number;
  teams: any[];
  highlightId?: string;
  editBudget?: (teamId: string, budget: number) => void;
  heightClass?: string;
}) {
  const [activeTab, setActiveTab] = useState<"teams" | "pool" | "unsold">("teams");

  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: "teams", label: `Teams (${teams.length})` },
    { key: "pool", label: `Pool (${poolCount})` },
    { key: "unsold", label: `Unsold (${unsoldCount})` },
  ];

  return (
    <div>
      <div className="flex border-b border-white/[0.08] mb-3">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-2.5 text-center text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === t.key ? "text-cyan-400 border-cyan-400" : "text-white/45 border-transparent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "teams" && (
        <TeamsPanel teams={teams} highlightId={highlightId} editBudget={editBudget} heightClass={heightClass} defaultExpanded />
      )}
      {activeTab === "pool" && <PlayerPoolPanel players={poolPlayers} count={poolCount} heightClass={heightClass} />}
      {activeTab === "unsold" && <UnsoldPanel players={unsoldPlayers} count={unsoldCount} heightClass={heightClass} />}
    </div>
  );
}

export default PoolUnsoldTeamsTabs;
