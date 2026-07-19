"use client";

import { useParams } from "next/navigation";
import { useAccount } from "@/lib/useAccount";
import { useAuction } from "@/lib/useAuction";
import { Gate } from "@/components/Gate";
import { AuctionNav } from "@/components/AuctionNav";
import { StatusStrip } from "@/components/StatusStrip";
import { PlayerCard } from "@/components/PlayerCard";
import { BidPanel } from "@/components/BidPanel";
import { PlayerPoolPanel, UnsoldPanel, TeamsPanel, RecentSalesPanel } from "@/components/TeamsPanel";
import { PoolUnsoldTeamsTabs } from "@/components/ResponsiveStatsGrid";

export default function CaptainPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const { token, account, error, loading } = useAccount(tournamentId);
  const { state, connected, socketError, clockOffset, events, lastResult, actions } = useAuction(tournamentId, token);

  if (loading) return <Gate>Connecting…</Gate>;
  if (error || !account) return <Gate error>{error ?? "Access denied"}</Gate>;
  if (!account.team)
    return <Gate error>This is the captain bidding view — you aren't captaining a team in this auction.</Gate>;

  const myTeam = state?.teams?.find((t: any) => t.id === account.team);

  const statusProps = {
    game: state?.game,
    status: state?.status,
    pass: state?.pass,
    counts: state?.counts,
    timerEndsAt: state?.timerEndsAt,
    clockOffset,
    tournamentName: state?.tournamentName,
    topSale: state?.topSale,
  };

  const poolPlayers = state?.players?.filter((p: any) => p.status === 'pool' || p.status === 'on_auction') ?? [];
  const unsoldPlayers = state?.players?.filter((p: any) => p.status === 'unsold') ?? [];

  return (
    <>
      <AuctionNav account={account} connected={connected} teamName={myTeam?.name} />
      <main className="pb-16">
        {/* ── MOBILE / TABLET (< xl): stacked ── */}
        <div className="block xl:hidden max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
          <StatusStrip {...statusProps} />
          {socketError && <p className="rounded-2xl border border-magenta/40 bg-magenta/[0.06] px-4 py-2 text-sm text-magenta">{socketError}</p>}
          <PlayerCard
            player={state?.currentPlayer} game={state?.game} price={state?.currentPrice}
            highestBidderName={state?.highestBidderName} status={state?.status} lastResult={lastResult}
            timerEndsAt={state?.timerEndsAt} clockOffset={clockOffset} defaultSeconds={state?.settings?.timerSeconds}
            layoutMode="mobile" pausedRemainingMs={state?.pausedRemainingMs}
          />
          <BidPanel state={state} myTeamId={account.team} onBid={actions.bid} />
          <RecentSalesPanel sales={state?.saleLog ?? []} heightClass="h-[250px]" />
          <PoolUnsoldTeamsTabs
            teams={state?.teams ?? []}
            highlightId={account.team}
            poolPlayers={poolPlayers}
            poolCount={state?.counts?.pool ?? 0}
            unsoldPlayers={unsoldPlayers}
            unsoldCount={state?.counts?.unsold ?? 0}
          />
        </div>

        {/* ── DESKTOP XL+: 3-column, centered ── */}
        <div className="hidden xl:block overflow-x-auto px-6">
          <div className="w-fit mx-auto">
            <StatusStrip {...statusProps} />
            {socketError && <p className="mb-4 rounded-2xl border border-magenta/40 bg-magenta/[0.06] px-4 py-2 text-sm text-magenta">{socketError}</p>}
            <div className="flex flex-row items-start gap-6 pb-6">
              {/* Column 1: Player Pool + Unsold */}
              <div className="w-[280px] shrink-0 space-y-6">
                <PlayerPoolPanel players={poolPlayers} count={state?.counts?.pool ?? 0} heightClass="h-[388px]" />
                <UnsoldPanel players={unsoldPlayers} count={state?.counts?.unsold ?? 0} heightClass="h-[388px]" />
              </div>
              {/* Column 2: Spotlight → Bid → Recent Sales */}
              <div className="w-[900px] shrink-0 space-y-6 h-[800px] flex flex-col">
                <PlayerCard
                  player={state?.currentPlayer} game={state?.game} price={state?.currentPrice}
                  highestBidderName={state?.highestBidderName} status={state?.status} lastResult={lastResult}
                  timerEndsAt={state?.timerEndsAt} clockOffset={clockOffset} defaultSeconds={state?.settings?.timerSeconds}
                  pausedRemainingMs={state?.pausedRemainingMs}
                />
                <BidPanel state={state} myTeamId={account.team} onBid={actions.bid} />
                <RecentSalesPanel sales={state?.saleLog ?? []} heightClass="flex-1 min-h-0" />
              </div>
              {/* Column 3: Teams */}
              <div className={`${state?.teams && state.teams.length > 5 ? "w-[720px]" : "w-[360px]"} shrink-0 transition-all duration-300`}>
                <TeamsPanel teams={state?.teams ?? []} highlightId={account.team} heightClass="h-[800px]" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
