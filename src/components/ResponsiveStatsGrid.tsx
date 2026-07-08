"use client";

import { useState } from "react";
import { PlayerPoolPanel, UnsoldPanel, TeamsPanel } from "./TeamsPanel";

export function ResponsiveStatsGrid({
  poolPlayers,
  poolCount,
  unsoldPlayers,
  unsoldCount,
  teams,
  highlightId,
  editBudget,
}: {
  poolPlayers: any[];
  poolCount: number;
  unsoldPlayers: any[];
  unsoldCount: number;
  teams: any[];
  highlightId?: string;
  editBudget?: (teamId: string, budget: number) => void;
}) {
  const [activeTab, setActiveTab] = useState<"pool" | "unsold" | "teams">("pool");

  return (
    <div>
      {/* Mobile Tab Buttons */}
      <div className="flex border-b border-white/[0.08] mb-4 md:hidden">
        <button
          onClick={() => setActiveTab("pool")}
          className={`flex-1 py-2.5 text-center text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
            activeTab === "pool" ? "text-cyan-400 border-cyan-400" : "text-white/45 border-transparent"
          }`}
        >
          Pool ({poolCount})
        </button>
        <button
          onClick={() => setActiveTab("unsold")}
          className={`flex-1 py-2.5 text-center text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
            activeTab === "unsold" ? "text-cyan-400 border-cyan-400" : "text-white/45 border-transparent"
          }`}
        >
          Unsold ({unsoldCount})
        </button>
        <button
          onClick={() => setActiveTab("teams")}
          className={`flex-1 py-2.5 text-center text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
            activeTab === "teams" ? "text-cyan-400 border-cyan-400" : "text-white/45 border-transparent"
          }`}
        >
          Teams ({teams.length})
        </button>
      </div>

      {/* Desktop side-by-side grid */}
      <div className="hidden md:grid md:grid-cols-3 md:gap-6">
        <PlayerPoolPanel players={poolPlayers} count={poolCount} />
        <UnsoldPanel players={unsoldPlayers} count={unsoldCount} />
        <TeamsPanel teams={teams} highlightId={highlightId} editBudget={editBudget} />
      </div>

      {/* Mobile single tab render */}
      <div className="block md:hidden">
        {activeTab === "pool" && <PlayerPoolPanel players={poolPlayers} count={poolCount} />}
        {activeTab === "unsold" && <UnsoldPanel players={unsoldPlayers} count={unsoldCount} />}
        {activeTab === "teams" && <TeamsPanel teams={teams} highlightId={highlightId} editBudget={editBudget} />}
      </div>
    </div>
  );
}

export default ResponsiveStatsGrid;
