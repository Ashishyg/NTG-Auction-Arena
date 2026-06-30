"use client";

import { useParams } from "next/navigation";
import { useAccount } from "@/lib/useAccount";
import { useAuction } from "@/lib/useAuction";
import { Gate } from "@/components/Gate";
import { TopBar } from "@/components/TopBar";
import { PlayerCard } from "@/components/PlayerCard";
import { TeamsPanel } from "@/components/TeamsPanel";
import { EventFeed } from "@/components/EventFeed";

export default function ObservePage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const { token, account, error, loading } = useAccount(tournamentId);
  const { state, connected, socketError, clockOffset, events } = useAuction(tournamentId, token);

  if (loading) return <Gate>Connecting…</Gate>;
  if (error || !account) return <Gate error>{error ?? "Access denied"}</Gate>;

  return (
    <main className="mx-auto min-h-screen max-w-7xl p-5 sm:p-6">
      <TopBar
        account={account}
        game={state?.game}
        status={state?.status}
        pass={state?.pass}
        connected={connected}
        timerEndsAt={state?.timerEndsAt}
        clockOffset={clockOffset}
        counts={state?.counts}
      />

      {socketError && (
        <p className="mb-4 rounded-2xl border border-magenta/40 bg-magenta/[0.06] px-4 py-2 text-sm text-magenta">{socketError}</p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        <PlayerCard
          player={state?.currentPlayer}
          game={state?.game}
          price={state?.currentPrice}
          highestBidderName={state?.highestBidderName}
          status={state?.status}
        />
        <div className="space-y-6">
          <TeamsPanel teams={state?.teams ?? []} highlightId={state?.highestBidder} />
          <EventFeed events={events} />
        </div>
      </div>
    </main>
  );
}
