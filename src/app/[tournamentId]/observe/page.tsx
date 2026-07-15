"use client";

import { useParams } from "next/navigation";
import { useAccount } from "@/lib/useAccount";
import { useAuction } from "@/lib/useAuction";
import { Gate } from "@/components/Gate";
import { AuctionNav } from "@/components/AuctionNav";
import { StatusStrip } from "@/components/StatusStrip";
import { PlayerCard } from "@/components/PlayerCard";
import { ResponsiveStatsGrid } from "@/components/ResponsiveStatsGrid";
import { BidHistoryPanel, RecentSalesPanel } from "@/components/TeamsPanel";
import { EventFeed } from "@/components/EventFeed";

export default function ObservePage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const { token, account, error, loading } = useAccount(tournamentId);
  const { state, connected, socketError, clockOffset, events, lastResult } = useAuction(tournamentId, token);

  if (loading) return <Gate>Connecting…</Gate>;
  if (error || !account) return <Gate error>{error ?? "Access denied"}</Gate>;

  const myTeam = state?.teams?.find((t: any) => t.id === account.team);

  return (
    <>
      <AuctionNav account={account} connected={connected} teamName={myTeam?.name} />
      <main className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <StatusStrip
          game={state?.game}
          status={state?.status}
          pass={state?.pass}
          counts={state?.counts}
          timerEndsAt={state?.timerEndsAt}
          clockOffset={clockOffset}
          tournamentName={state?.tournamentName}
        />

        {socketError && (
          <p className="mb-4 rounded-2xl border border-magenta/40 bg-magenta/[0.06] px-4 py-2 text-sm text-magenta">{socketError}</p>
        )}

        <div className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-[3fr_1fr] lg:gap-6">
          {/* Left Column: Spotlight Player and Stats Dashboard */}
          <div className="space-y-6">
            {/* Spotlight player card */}
            <div>
              <PlayerCard player={state?.currentPlayer} game={state?.game} price={state?.currentPrice} highestBidderName={state?.highestBidderName} status={state?.status} lastResult={lastResult} />
            </div>

            {/* Responsive stats grids (Pool, Unsold, Teams) */}
            <div>
              <ResponsiveStatsGrid
                poolPlayers={state?.players?.filter((p: any) => p.status === 'pool' || p.status === 'on_auction') ?? []}
                poolCount={state?.counts?.pool ?? 0}
                unsoldPlayers={state?.players?.filter((p: any) => p.status === 'unsold') ?? []}
                unsoldCount={state?.counts?.unsold ?? 0}
                teams={state?.teams ?? []}
                highlightId={state?.highestBidder}
              />
            </div>
          </div>

          {/* Right Column: Bid History & Recent Sales */}
          <div className="space-y-6">
            <div>
              <BidHistoryPanel bids={state?.bidHistory ?? []} />
            </div>
            <div>
              <RecentSalesPanel sales={state?.saleLog ?? []} />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
