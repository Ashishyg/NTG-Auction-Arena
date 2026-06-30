"use client";

import { useEffect, useState } from "react";
import type { Account } from "./auth";

/** Reads the handoff token from ?token= (persisted to sessionStorage), then
 *  resolves the caller's role for this tournament via /api/auth. */
export function useAccount(tournamentId: string) {
  const [token, setToken] = useState<string | undefined>();
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const key = `ntg-auction-token:${tournamentId}`;
    const url = new URL(window.location.href);
    const fromUrl = url.searchParams.get("token") || undefined;
    const t = fromUrl ?? sessionStorage.getItem(key) ?? undefined;
    if (fromUrl) {
      sessionStorage.setItem(key, fromUrl);
      url.searchParams.delete("token");
      window.history.replaceState({}, "", url.toString());
    }
    setToken(t);

    if (!t) {
      setError("No token — open this from the NTG site");
      setLoading(false);
      return;
    }
    fetch("/api/auth", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${t}` },
      body: JSON.stringify({ tournamentId }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error || "Access denied");
        setAccount(await r.json());
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tournamentId]);

  return { token, account, error, loading };
}
