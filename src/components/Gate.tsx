"use client";

/** Centered status card for loading / access-denied states. */
export function Gate({ children, error }: { children: React.ReactNode; error?: boolean }) {
  return (
    <main className="grid min-h-screen place-items-center p-8">
      <div className="panel w-full max-w-md p-8 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ntg-logo.png" alt="NTG" className="mx-auto h-11 w-11 rounded-xl object-cover" />
        <p className="mt-4 text-[10px] font-medium uppercase tracking-[0.32em] text-white/40">NTG Auction Arena</p>
        <p className={`mt-2 ${error ? "text-magenta" : "text-white/70"}`}>{children}</p>
      </div>
    </main>
  );
}

export default Gate;
