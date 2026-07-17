"use client";

import { useEffect, useState } from "react";

/** Countdown to `endsAt`, corrected by the server clock offset. */
export function Timer({
  endsAt,
  clockOffset = 0,
  size = "text-3xl",
  defaultSeconds = 15,
}: {
  endsAt?: string | null;
  clockOffset?: number;
  size?: string;
  defaultSeconds?: number;
}) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [endsAt]);

  if (!endsAt) {
    const formatted = Number(defaultSeconds).toFixed(1);
    return <span className={`font-display ${size} text-white/20 tabular-nums`}>{formatted}s</span>;
  }

  // clockOffset = clientNow - serverNow, so subtract it to compare in server time.
  const msLeft = Math.max(new Date(endsAt).getTime() - (now - clockOffset), 0);
  const secs = (msLeft / 1000).toFixed(1);
  const urgent = msLeft < 5000;

  return (
    <span className={`font-display ${size} inline-block tabular-nums transition-all ${urgent ? "timer-panic" : "text-brand"}`}>{secs}s</span>
  );
}

export default Timer;
