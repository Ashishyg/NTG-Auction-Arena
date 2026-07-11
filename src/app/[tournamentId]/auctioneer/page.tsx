"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useAccount } from "@/lib/useAccount";
import { useAuction } from "@/lib/useAuction";
import { Gate } from "@/components/Gate";
import { AuctionNav } from "@/components/AuctionNav";
import { StatusStrip } from "@/components/StatusStrip";
import { PlayerCard } from "@/components/PlayerCard";
import { TeamsPanel, BidHistoryPanel, RecentSalesPanel } from "@/components/TeamsPanel";
import { EventFeed } from "@/components/EventFeed";
import { LiveControls } from "@/components/LiveControls";
import { BidPanel } from "@/components/BidPanel";
import { SetupPanel } from "@/components/SetupPanel";
import { PlayerBoard } from "@/components/PlayerBoard";
import { ResponsiveStatsGrid } from "@/components/ResponsiveStatsGrid";

const TABS = [
  { key: "live", label: "Live" },
  { key: "setup", label: "Setup" },
];

export default function AuctioneerPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const { token, account, error, loading } = useAccount(tournamentId);
  const { state, connected, socketError, clockOffset, events, lastResult, actions } = useAuction(tournamentId, token);
  const [tab, setTab] = useState("live");

  if (loading) return <Gate>Connecting…</Gate>;
  if (error || !account) return <Gate error>{error ?? "Access denied"}</Gate>;
  if (!account.isAdmin)
    return <Gate error>Auctioneer view is admin-only. Use your captain/observer link.</Gate>;

  const myTeam = state?.teams?.find((t: any) => t.id === account.team);

  return (
    <>
      <AuctionNav account={account} connected={connected} tabs={TABS} activeTab={tab} onTab={setTab} teamName={myTeam?.name} />
      <main className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <StatusStrip
          game={state?.game}
          status={state?.status}
          pass={state?.pass}
          counts={state?.counts}
          timerEndsAt={state?.timerEndsAt}
          clockOffset={clockOffset}
          eyebrow={tab === "setup" ? "Auction Setup" : "Live Auction"}
        />

        {socketError && (
          <p className="mb-4 rounded-2xl border border-magenta/40 bg-magenta/[0.06] px-4 py-2 text-sm text-magenta">{socketError}</p>
        )}
        {connected && !state && !socketError && <p className="mb-4 text-sm text-white/50">Connected — waiting for auction state…</p>}

        {tab === "live" ? (
          <div className="space-y-6">
            {/* Spotlight player card */}
            <PlayerCard player={state?.currentPlayer} game={state?.game} price={state?.currentPrice} highestBidderName={state?.highestBidderName} status={state?.status} lastResult={lastResult} />

            {/* Live controller panels */}
            <LiveControls state={state} actions={actions} />

            {/* Own-team bidding controls — for an admin who is also captaining a team here */}
            {account.team && <BidPanel state={state} myTeamId={account.team} onBid={actions.bid} />}

            {/* Responsive stats grid */}
            <div className="mt-6">
              <ResponsiveStatsGrid
                poolPlayers={state?.players?.filter((p: any) => p.status === 'pool' || p.status === 'on_auction') ?? []}
                poolCount={state?.counts?.pool ?? 0}
                unsoldPlayers={state?.players?.filter((p: any) => p.status === 'unsold') ?? []}
                unsoldCount={state?.counts?.unsold ?? 0}
                teams={state?.teams ?? []}
                highlightId={state?.highestBidder}
              />
            </div>

            {/* Bottom panels (Bid History & Recent Sales) */}
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <BidHistoryPanel bids={state?.bidHistory ?? []} />
              <RecentSalesPanel sales={state?.saleLog ?? []} />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <SetupPanel state={state} actions={actions} />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
              <PlayerBoard
                players={state?.players ?? []}
                teams={state?.teams ?? []}
                onSetFloor={actions.setFloor}
                onSell={(regId, teamId, price) => actions.manualSell(teamId, price, regId)}
              />
              <TeamsPanel teams={state?.teams ?? []} highlightId={state?.highestBidder} editBudget={actions.setTeamBudget} />
            </div>
          </div>
        )}
      </main>
    </>
  );
}
