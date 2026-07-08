"use client";

import { useParams } from "next/navigation";
import { useAccount } from "@/lib/useAccount";
import { useAuction } from "@/lib/useAuction";
import { Gate } from "@/components/Gate";
import { AuctionNav } from "@/components/AuctionNav";
import { StatusStrip } from "@/components/StatusStrip";
import { PlayerCard } from "@/components/PlayerCard";
import { BidPanel } from "@/components/BidPanel";
import { ResponsiveStatsGrid } from "@/components/ResponsiveStatsGrid";
import { BidHistoryPanel, RecentSalesPanel } from "@/components/TeamsPanel";
import { EventFeed } from "@/components/EventFeed";

export default function CaptainPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const { token, account, error, loading } = useAccount(tournamentId);
  const { state, connected, socketError, clockOffset, events, actions } = useAuction(tournamentId, token);

  if (loading) return <Gate>Connecting…</Gate>;
  if (error || !account) return <Gate error>{error ?? "Access denied"}</Gate>;
  if (account.role !== "captain")
    return <Gate error>This is the captain bidding view — your role here is {account.role}.</Gate>;

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
        />

        {socketError && (
          <p className="mb-4 rounded-2xl border border-magenta/40 bg-magenta/[0.06] px-4 py-2 text-sm text-magenta">{socketError}</p>
        )}

        <div className="space-y-6">
          {/* Spotlight player card */}
          <PlayerCard player={state?.currentPlayer} game={state?.game} price={state?.currentPrice} highestBidderName={state?.highestBidderName} status={state?.status} />
          
          {/* Bidding controls panel */}
          <BidPanel state={state} myTeamId={account.team} onBid={actions.bid} />
        </div>

        {/* Responsive stats grid */}
        <div className="mt-6">
          <ResponsiveStatsGrid
            poolPlayers={state?.players?.filter((p: any) => p.status === 'pool' || p.status === 'on_auction') ?? []}
            poolCount={state?.counts?.pool ?? 0}
            unsoldPlayers={state?.players?.filter((p: any) => p.status === 'unsold') ?? []}
            unsoldCount={state?.counts?.unsold ?? 0}
            teams={state?.teams ?? []}
            highlightId={account.team}
          />
        </div>

        {/* Bottom panels (Bid History & Recent Sales) */}
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <BidHistoryPanel bids={state?.bidHistory ?? []} />
          <RecentSalesPanel sales={state?.saleLog ?? []} />
        </div>
      </main>
    </>
  );
}
