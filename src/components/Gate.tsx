"use client";

/** Centered status card for loading / access-denied states. */
export function Gate({ children, error }: { children: React.ReactNode; error?: boolean }) {
  return (
    <main className="grid min-h-screen place-items-center p-8">
      <div className="panel w-full max-w-md p-8 text-center">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-[var(--color-iris)] to-[var(--color-brand)] font-display text-sm font-bold text-[#06121a]">NA</span>
        <p className="mt-4 text-[10px] font-medium uppercase tracking-[0.32em] text-white/40">NTG Auction Arena</p>
        <p className={`mt-2 ${error ? "text-magenta" : "text-white/70"}`}>{children}</p>
      </div>
    </main>
  );
}

export default Gate;
