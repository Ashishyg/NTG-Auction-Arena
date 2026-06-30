export default function Home() {
  return (
    <main className="grid min-h-screen place-items-center p-8">
      <div className="panel w-full max-w-lg p-10 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-[var(--color-iris)] to-[var(--color-brand)] font-display text-base font-bold text-[#06121a] shadow-[0_0_14px_rgba(94,234,212,0.5)]">
          NA
        </span>
        <p className="mt-5 text-[10px] font-medium uppercase tracking-[0.42em] text-[var(--color-brand)]/85">NTG Auction Arena</p>
        <h1 className="mt-3 font-display text-5xl font-semibold tracking-[-0.02em] text-white">
          Auction <span className="text-gradient-brand">Arena</span>
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-white/50">
          Open an auction from the NTG site. You&apos;ll arrive at your tournament&apos;s
          <span className="mx-1 text-brand">auctioneer</span>,
          <span className="mx-1 text-brand">captain</span>, or
          <span className="mx-1 text-brand">observer</span> view with your access token.
        </p>
      </div>
    </main>
  );
}
