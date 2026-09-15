export default function Loading() {
  return (
    <div className="min-h-screen" aria-busy="true" aria-label="Chargement">
      <header className="topbar">
        <div className="shell flex items-center justify-between py-3">
          <span className="skel skel-mark" />
          <span className="skel skel-actions" />
        </div>
      </header>
      <main className="shell py-10 sm:py-14">
        <span className="skel skel-kicker" />
        <span className="skel skel-title" />
        <span className="skel skel-line" />
        <div className="mt-10 grid gap-3">
          <span className="skel skel-card" />
          <span className="skel skel-card" />
          <span className="skel skel-card" />
        </div>
      </main>
    </div>
  );
}
