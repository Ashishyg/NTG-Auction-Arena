export default function Home() {
  return (
    <main className="grid min-h-screen place-items-center p-8">
      <div className="glass w-full max-w-lg p-8 text-center">
        <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-white/40">NTG Auction Arena</p>
        <h1 className="mt-3 font-display text-5xl text-gradient-brand">Auction Arena</h1>
        <p className="mt-4 text-sm leading-relaxed text-white/60">
          Open an auction from the NTG site. You&apos;ll arrive at your tournament&apos;s
          <code className="mx-1 text-brand">/auctioneer</code>,
          <code className="mx-1 text-brand">/captain</code>, or
          <code className="mx-1 text-brand">/observe</code> view with your access token.
        </p>
      </div>
    </main>
  );
}
