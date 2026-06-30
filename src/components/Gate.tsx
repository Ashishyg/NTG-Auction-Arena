"use client";

/** Centered status card for loading / access-denied states. */
export function Gate({ children, error }: { children: React.ReactNode; error?: boolean }) {
  return (
    <main className="min-h-screen grid place-items-center p-8">
      <div className="glass max-w-md w-full p-8 text-center">
        <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/40">NTG Auction</p>
        <p className={`mt-3 ${error ? "text-magenta" : "text-white/70"}`}>{children}</p>
      </div>
    </main>
  );
}

export default Gate;
