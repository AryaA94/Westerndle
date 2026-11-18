const WORD = "WESTERNDLE";

/** Purple hero bar with the name spelled out in game tiles: WESTERN in white, DLE in gold. */
export function Header({ onHome, onHelp, onStats }: { onHome: () => void; onHelp: () => void; onStats: () => void }) {
  return (
    <header className="hero-pattern relative overflow-hidden bg-gradient-to-br from-[#6a35ad] via-purple-western to-purple-deep text-white shadow-lg">
      <div className="relative mx-auto flex max-w-2xl items-center justify-between gap-2 px-4 py-4 sm:py-5">
        <IconButton label="How to play" onClick={onHelp}>
          <span className="text-lg font-bold">?</span>
        </IconButton>

        <button onClick={onHome} aria-label="Westerndle: back to the menu" className="rounded-lg transition hover:scale-105">
        <h1 className="flex gap-[2px] sm:gap-1">
          {WORD.split("").map((ch, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={`tile-pop font-display grid h-7 w-[22px] place-items-center rounded-md text-[15px] font-extrabold shadow-sm sm:h-9 sm:w-8 sm:text-xl ${
                i < 7 ? "bg-white text-purple-western" : "bg-close text-purple-deep"
              }`}
              style={{ animationDelay: `${i * 45}ms` }}
            >
              {ch}
            </span>
          ))}
        </h1>
        </button>

        <IconButton label="Statistics" onClick={onStats}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="3" y="12" width="4" height="9" rx="1" />
            <rect x="10" y="7" width="4" height="14" rx="1" />
            <rect x="17" y="3" width="4" height="18" rx="1" />
          </svg>
        </IconButton>
      </div>
    </header>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 ring-1 ring-white/30 transition hover:bg-white/20"
    >
      {children}
    </button>
  );
}
