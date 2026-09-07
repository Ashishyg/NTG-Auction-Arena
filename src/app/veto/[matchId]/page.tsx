"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Gate } from "@/components/Gate";
import { useVeto } from "@/lib/useVeto";
import { VetoBoard } from "@/components/veto/VetoBoard";

/** Reads the handoff token from ?token= and keeps it for the session. */
function useHandoffToken(matchId: string) {
  const [token, setToken] = useState<string | undefined>();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const key = `ntg-veto-token:${matchId}`;
    const url = new URL(window.location.href);
    const fromUrl = url.searchParams.get("token") || undefined;
    const t = fromUrl ?? sessionStorage.getItem(key) ?? undefined;
    if (fromUrl) {
      sessionStorage.setItem(key, fromUrl);
      url.searchParams.delete("token");
      window.history.replaceState({}, "", url.toString());
    }
    setToken(t);
    setReady(true);
  }, [matchId]);

  return { token, ready };
}

export default function VetoPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const { token, ready } = useHandoffToken(matchId);
  const { state, account, connected, error, act, setFormat, setReady } = useVeto(matchId, token);

  if (!ready) return <Gate>Loading…</Gate>;
  if (!token) return <Gate error>No token — open this from the NTG site.</Gate>;
  if (error) return <Gate error>{error}</Gate>;
  if (!state || !account) return <Gate>{connected ? "Loading veto…" : "Connecting…"}</Gate>;

  return (
    <VetoBoard
      state={state}
      account={account}
      act={act}
      setFormat={setFormat}
      setReady={setReady}
    />
  );
}
