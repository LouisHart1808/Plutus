import FxDashboard from "../components/FxDashboard";
import { formatDateSGT, getGreetingSGT } from "../lib/time";

export default function HomePage() {
  const now = new Date();
  const greeting = getGreetingSGT(now);
  const dateLabel = formatDateSGT(now);

  return (
    <main className="min-h-screen bg-transparent text-neutral-100 grid-bg noise">
      {/* Subtle cinematic framing */}
      <div className="vignette">
        {/* Neon glow behind the header */}
        <div className="header-glow">
          <div className="mx-auto w-full max-w-screen-2xl px-4 py-8 md:px-8 2xl:px-12">
            <header className="mb-8 flex flex-col gap-2">
              <h1 className="neon-text text-3xl font-semibold tracking-tight">
                {greeting}
              </h1>
              <p className="text-sm text-neutral-400">{dateLabel}</p>
            </header>

            <FxDashboard />
          </div>
        </div>
      </div>
    </main>
  );
}
