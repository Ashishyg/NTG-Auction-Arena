"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Socket } from "socket.io-client";

/**
 * Single client-side mirror of the server's auction state. Connects an
 * authenticated socket, joins the tournament room, and keeps the latest
 * snapshot. The server is the source of truth — this hook never computes
 * auction outcomes, only renders what the server sends and forwards actions.
 * On (re)connect it re-joins automatically (auto-resync after a dropped Wi-Fi).
 */
export function useAuction(tournamentId?: string, token?: string, apiBase = "") {
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const [socketError, setSocketError] = useState<string | null>(null);
  const [clockOffset, setClockOffset] = useState(0); // clientNow - serverNow
  const [events, setEvents] = useState<any[]>([]); // transient feed (bids/sales)
  // Last sale outcome — shown inline in the player card's empty state (no
  // popup). Stays until replaced by the next sold/unsold event or a new
  // player is drawn (at which point the card just shows that player instead).
  const [lastResult, setLastResult] = useState<
    | { type: "sold"; playerName: string; teamName: string; price: number }
    | { type: "unsold"; playerName: string }
    | null
  >(null);

  const pushEvent = useCallback((e: any) => {
    setEvents((prev) => [{ id: Date.now() + Math.random(), ...e }, ...prev].slice(0, 30));
  }, []);

  useEffect(() => {
    if (!token || !tournamentId) return undefined;

    let active = true;
    let socket: any = null;

    import("socket.io-client").then(({ io }) => {
      if (!active) return;

      socket = io(apiBase || undefined, {
        auth: { token },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 500,
        reconnectionDelayMax: 3000,
      });
      socketRef.current = socket;

      const join = () => socket?.emit("join", { tournamentId });

      socket.on("connect", () => {
        setConnected(true);
        setSocketError(null);
        join(); // also fires on every reconnect → automatic resync
      });
      socket.on("disconnect", () => setConnected(false));
      socket.on("connect_error", (e: any) => setSocketError(`Socket: ${e.message}`));
      socket.on("denied", (e: any) => setSocketError(e?.reason || "Access denied"));

      socket.on("state", (snap: any) => {
        if (snap?.serverTime) setClockOffset(Date.now() - snap.serverTime);
        setState(snap);
      });
      socket.on("bidPlaced", (e: any) => pushEvent({ type: "bid", ...e }));
      socket.on("playerSold", (e: any) => {
        pushEvent({ type: "sold", ...e });
        setLastResult({ type: "sold", ...e });
      });
      socket.on("playerUnsold", (e: any) => {
        pushEvent({ type: "unsold", ...e });
        setLastResult({ type: "unsold", ...e });
      });
    });

    return () => {
      active = false;
      if (socket) {
        socket.removeAllListeners();
        socket.close();
      }
      socketRef.current = null;
    };
  }, [token, tournamentId, apiBase, pushEvent]);

  const emit = useCallback(
    (event: string, payload: Record<string, unknown> = {}) =>
      new Promise<any>((resolve) => {
        const socket = socketRef.current;
        if (!socket) return resolve({ error: "Not connected" });
        socket.emit(event, payload, (ack: any) => resolve(ack || {}));
      }),
    [],
  );

  const actions = {
    bid: (amount: number) => emit("bid", { amount }),
    selectPlayer: (pass = 1) => emit("selectPlayer", { pass }),
    startAuction: () => emit("startAuction"),
    hammer: () => emit("hammer"),
    pause: () => emit("pause"),
    resume: () => emit("resume"),
    undoLastSale: () => emit("undoLastSale"),
    publishResults: () => emit("publishResults"),
    updateSettings: (s: { timerSeconds?: number; minBidIncrement?: number; rosterSize?: number; safeMaxCoreOnly?: boolean }) =>
      emit("updateSettings", s),
    addTime: (ms: number) => emit("addTime", { ms }),
    setPrice: (amount: number) => emit("setPrice", { amount }),
    manualSell: (teamId: string, price: number, registrationId?: string) =>
      emit("manualSell", { teamId, price, registrationId }),
    setFloor: (registrationId: string, floor: number) => emit("setFloor", { registrationId, floor }),
    setTeamBudget: (teamId: string, budget: number) => emit("setTeamBudget", { teamId, budget }),
    setRankTable: (rankTable: { rank: string; floor: number }[]) => emit("setRankTable", { rankTable }),
    setTeamColor: (teamId: string, color: string) => emit("setTeamColor", { teamId, color }),
    resetAuction: () => emit("resetAuction"),
    saveAuction: () => emit("saveAuction"),
  };

  return { state, connected, socketError, clockOffset, events, lastResult, actions };
}

export default useAuction;
