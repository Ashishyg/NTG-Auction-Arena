"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useAccount } from "@/lib/useAccount";
import { useAuction } from "@/lib/useAuction";
import { Gate } from "@/components/Gate";
import { AuctionNav } from "@/components/AuctionNav";
import { StatusStrip } from "@/components/StatusStrip";
import { PlayerCard } from "@/components/PlayerCard";
import { PlayerPoolPanel, UnsoldPanel, TeamsPanel, RecentSalesPanel } from "@/components/TeamsPanel";
import { PoolUnsoldTeamsTabs } from "@/components/ResponsiveStatsGrid";
import { LiveControls } from "@/components/LiveControls";
import { BidPanel } from "@/components/BidPanel";
import { SetupPanel } from "@/components/SetupPanel";
import { PlayerBoard } from "@/components/PlayerBoard";

const TABS = [
  { key: "live", label: "Live" },
  { key: "setup", label: "Setup" },
];

export default function AuctioneerPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const { token, account, error, loading } = useAccount(tournamentId);
  const { state, connected, socketError, clockOffset, events, lastResult, actions } = useAuction(tournamentId, token);
  const [tab, setTab] = useState("live");
  const [setupTab, setSetupTab] = useState<"board" | "teams">("board");

  if (loading) return <Gate>Connecting…</Gate>;
  if (error || !account) return <Gate error>{error ?? "Access denied"}</Gate>;
  if (!account.isAdmin)
    return <Gate error>Auctioneer view is admin-only. Use your captain/observer link.</Gate>;

  const myTeam = state?.teams?.find((t: any) => t.id === account.team);

  const statusProps = {
    game: state?.game,
    status: state?.status,
    pass: state?.pass,
    counts: state?.counts,
    timerEndsAt: state?.timerEndsAt,
    clockOffset,
    eyebrow: tab === "setup" ? "Auction Setup" as const : "Live Auction" as const,
    tournamentName: state?.tournamentName,
  };

  const poolPlayers = state?.players?.filter((p: any) => p.status === 'pool' || p.status === 'on_auction') ?? [];
  const unsoldPlayers = state?.players?.filter((p: any) => p.status === 'unsold') ?? [];

  return (
    <>
      <AuctionNav account={account} connected={connected} tabs={TABS} activeTab={tab} onTab={setTab} teamName={myTeam?.name} />
      <main className="pb-16">
        {/* ── MOBILE / TABLET (< xl): stacked ── */}
        <div className="block xl:hidden max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
          <StatusStrip {...statusProps} />
          {socketError && <p className="rounded-2xl border border-magenta/40 bg-magenta/[0.06] px-4 py-2 text-sm text-magenta">{socketError}</p>}
          {connected && !state && !socketError && <p className="text-sm text-white/50">Connected — waiting for auction state…</p>}
          {tab === "live" ? (
            <>
              <PlayerCard
                player={state?.currentPlayer} game={state?.game} price={state?.currentPrice}
                highestBidderName={state?.highestBidderName} status={state?.status} lastResult={lastResult}
                timerEndsAt={state?.timerEndsAt} clockOffset={clockOffset} defaultSeconds={state?.settings?.timerSeconds}
                layoutMode="mobile" pausedRemainingMs={state?.pausedRemainingMs}
              />
              <LiveControls state={state} actions={actions} />
              {account.team && <BidPanel state={state} myTeamId={account.team} onBid={actions.bid} />}
              <RecentSalesPanel sales={state?.saleLog ?? []} heightClass="h-[250px]" />
              <PoolUnsoldTeamsTabs
                teams={state?.teams ?? []}
                highlightId={state?.highestBidder}
                poolPlayers={poolPlayers}
                poolCount={state?.counts?.pool ?? 0}
                unsoldPlayers={unsoldPlayers}
                unsoldCount={state?.counts?.unsold ?? 0}
              />
            </>
          ) : (
            <>
              <SetupPanel state={state} actions={actions} />

              {/* < lg: tabbed to avoid a long stacked scroll */}
              <div className="lg:hidden">
                <div className="flex border-b border-white/[0.08] mb-3">
                  <button
                    type="button"
                    onClick={() => setSetupTab("board")}
                    className={`flex-1 py-2.5 text-center text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
                      setupTab === "board" ? "text-cyan-400 border-cyan-400" : "text-white/45 border-transparent"
                    }`}
                  >
                    Player Board
                  </button>
                  <button
                    type="button"
                    onClick={() => setSetupTab("teams")}
                    className={`flex-1 py-2.5 text-center text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
                      setupTab === "teams" ? "text-cyan-400 border-cyan-400" : "text-white/45 border-transparent"
                    }`}
                  >
                    Teams ({state?.teams?.length ?? 0})
                  </button>
                </div>
                {setupTab === "board" ? (
                  <PlayerBoard
                    players={state?.players ?? []} teams={state?.teams ?? []}
                    onSetFloor={actions.setFloor}
                    onSell={(regId, teamId, price) => actions.manualSell(teamId, price, regId)}
                  />
                ) : (
                  <TeamsPanel teams={state?.teams ?? []} highlightId={state?.highestBidder} editBudget={actions.setTeamBudget} singleColumn={true} heightClass="h-[730px]" />
                )}
              </div>

              {/* lg+ (still inside the < xl mobile/tablet block): side-by-side */}
              <div className="hidden lg:grid lg:grid-cols-[1fr_360px] gap-6">
                <PlayerBoard
                  players={state?.players ?? []} teams={state?.teams ?? []}
                  onSetFloor={actions.setFloor}
                  onSell={(regId, teamId, price) => actions.manualSell(teamId, price, regId)}
                />
                <TeamsPanel teams={state?.teams ?? []} highlightId={state?.highestBidder} editBudget={actions.setTeamBudget} singleColumn={true} heightClass="h-[730px]" />
              </div>
            </>
          )}
        </div>

        {/* ── DESKTOP XL+: 3-column, centered ── */}
        <div className="hidden xl:block overflow-x-auto px-6">
          <div className={tab === "live" ? "w-fit mx-auto" : "w-full max-w-[1400px] mx-auto"}>
            <StatusStrip {...statusProps} />
            {socketError && <p className="mb-4 rounded-2xl border border-magenta/40 bg-magenta/[0.06] px-4 py-2 text-sm text-magenta">{socketError}</p>}
            {connected && !state && !socketError && <p className="mb-4 text-sm text-white/50">Connected — waiting for auction state…</p>}
            {tab === "live" ? (
              <div className="flex flex-row items-start gap-6 pb-6">
                {/* Column 1: Player Pool + Unsold */}
                <div className="w-[280px] shrink-0 space-y-6">
                  <PlayerPoolPanel players={poolPlayers} count={state?.counts?.pool ?? 0} heightClass="h-[388px]" />
                  <UnsoldPanel players={unsoldPlayers} count={state?.counts?.unsold ?? 0} heightClass="h-[388px]" />
                </div>
                {/* Column 2: Spotlight → Round Controls → Bid → Recent Sales */}
                <div className="w-[900px] shrink-0 space-y-6 h-[800px] flex flex-col">
                  <PlayerCard
                    player={state?.currentPlayer} game={state?.game} price={state?.currentPrice}
                    highestBidderName={state?.highestBidderName} status={state?.status} lastResult={lastResult}
                    timerEndsAt={state?.timerEndsAt} clockOffset={clockOffset} defaultSeconds={state?.settings?.timerSeconds}
                    pausedRemainingMs={state?.pausedRemainingMs}
                  />
                  <LiveControls state={state} actions={actions} />
                  {account.team && <BidPanel state={state} myTeamId={account.team} onBid={actions.bid} />}
                  <RecentSalesPanel sales={state?.saleLog ?? []} heightClass="flex-1 min-h-0" />
                </div>
                {/* Column 3: Teams */}
                <div className={`${state?.teams && state.teams.length > 5 ? "w-[720px]" : "w-[360px]"} shrink-0 transition-all duration-300`}>
                  <TeamsPanel teams={state?.teams ?? []} highlightId={state?.highestBidder} heightClass="h-[800px]" />
                </div>
              </div>
            ) : (
              <div className="space-y-6 pb-6">
                <SetupPanel state={state} actions={actions} />
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
                  <PlayerBoard
                    players={state?.players ?? []} teams={state?.teams ?? []}
                    onSetFloor={actions.setFloor}
                    onSell={(regId, teamId, price) => actions.manualSell(teamId, price, regId)}
                  />
                  <TeamsPanel teams={state?.teams ?? []} highlightId={state?.highestBidder} editBudget={actions.setTeamBudget} singleColumn={true} heightClass="h-[730px]" />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
