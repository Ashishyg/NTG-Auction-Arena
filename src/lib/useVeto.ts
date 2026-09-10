"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import type { VetoAccount } from "./veto-auth";

/**
 * Client mirror of the server's veto state. Same contract as useAuction: the
 * server decides everything, this only renders what it sends and forwards
 * intent. Re-joins on reconnect so a dropped connection self-heals.
 */
export function useVeto(matchId?: string, token?: string) {
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<any>(null);
  const [account, setAccount] = useState<VetoAccount | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !matchId) return undefined;

    let active = true;
    let socket: any = null;

    import("socket.io-client").then(({ io }) => {
      if (!active) return;

      socket = io("/veto", {
        auth: { token },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 500,
        reconnectionDelayMax: 3000,
      });
      socketRef.current = socket;

      const join = () => socket?.emit("join", { matchId });

      socket.on("connect", () => {
        setConnected(true);
        setError(null);
        join();
      });
      socket.on("disconnect", () => setConnected(false));
      socket.on("connect_error", (e: any) => setError(e?.message ?? "Connection failed"));
      socket.on("denied", (e: any) => setError(e?.reason ?? "Access denied"));
      socket.on("veto:account", (a: VetoAccount) => setAccount(a));
      socket.on("veto:state", (snap: any) => setState(snap));
    });

    return () => {
      active = false;
      socket?.close();
      socketRef.current = null;
    };
  }, [matchId, token]);

  // An admin format change restarts the veto server-side without telling open
  // screens, so refetch whenever this tab comes back into view.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      socketRef.current?.emit("veto:resync", null, (snap: any) => {
        if (snap && !snap.error) setState(snap);
      });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const act = useCallback(
    (payload: { map?: string; side?: "attack" | "defence" }) =>
      new Promise<{ ok: true } | { error: string }>((resolve) => {
        const socket = socketRef.current;
        if (!socket) return resolve({ error: "Not connected" });
        socket.emit("veto:act", payload, (r: any) => resolve(r ?? { error: "No response" }));
      }),
    [],
  );


  const setReady = useCallback(
    (ready: boolean) =>
      new Promise<{ ok: true } | { error: string }>((resolve) => {
        const socket = socketRef.current;
        if (!socket) return resolve({ error: "Not connected" });
        socket.emit("veto:ready", { ready }, (r: any) => resolve(r ?? { error: "No response" }));
      }),
    [],
  );

  return { state, account, connected, error, act, setReady };
}
