import { useEffect, useState } from "react";
import { api } from "../api";
import type { GlobalStats, Mode } from "../types";

/** Shown before the first guess so the page isn't empty: what you're guessing and how to read the tiles. */
export function MysteryCard({ mode, puzzle }: { mode: Mode; puzzle?: number }) {
  const [stats, setStats] = useState<GlobalStats>();
  useEffect(() => {
    if (mode === "daily" && puzzle) api.stats(puzzle).then(setStats).catch(() => {});
  }, [mode, puzzle]);

  return (
    <section className="flip-in overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-purple-western/10 dark:bg-white/5 dark:ring-white/10">
      <div className="flex items-center gap-4 bg-gradient-to-r from-purple-mist to-white p-5 dark:from-purple-western/30 dark:to-transparent">
        <MysteryBuilding />
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-purple-western/70 dark:text-purple-200/70">
            {mode === "daily" ? `Daily #${puzzle}` : "Practice round"}
          </p>
          <h2 className="font-display text-xl font-extrabold leading-tight text-purple-deep dark:text-white sm:text-2xl">
            {mode === "daily" ? "Which building is today's mystery?" : "Guess a random building"}
          </h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
            {mode === "daily"
              ? stats && stats.plays > 0
                ? `${stats.plays} ${stats.plays === 1 ? "player has" : "players have"} played today · ${Math.round((stats.wins / stats.plays) * 100)}% got it`
                : "Be the first to solve today's building."
              : "Unlimited rounds. Doesn't affect your streak."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-purple-western/10 p-4 text-center text-xs dark:border-white/10">
        <Legend className="bg-gradient-to-br from-[#6a35ad] to-purple-western text-white" label="Exact" />
        <Legend className="bg-gradient-to-br from-[#f0c14b] to-close text-purple-deep" label="Close" />
        <Legend className="bg-white text-neutral-500 ring-1 ring-neutral-300 dark:bg-white/10 dark:text-neutral-300 dark:ring-white/20" label="Miss" />
        <p className="col-span-3 mt-1 text-neutral-500 dark:text-neutral-400">
          ▲▼ say if the answer is higher or lower. The arrow and distance point from your guess to the answer.
        </p>
      </div>
    </section>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return <div className={`rounded-lg py-2 font-bold shadow-sm ${className}`}>{label}</div>;
}

/** A campus-style building with a question mark in the doorway. */
function MysteryBuilding() {
  return (
    <svg viewBox="0 0 96 96" className="h-20 w-20 shrink-0 drop-shadow-sm sm:h-24 sm:w-24" aria-hidden="true">
      <rect x="4" y="4" width="88" height="88" rx="20" fill="#4f2683" />
      {/* tower */}
      <rect x="40" y="16" width="16" height="20" fill="#ece6f5" />
      <path d="M38 17 L48 8 L58 17 Z" fill="#d9a520" />
      <circle cx="48" cy="25" r="4" fill="#4f2683" />
      {/* main hall */}
      <rect x="18" y="36" width="60" height="44" fill="#ece6f5" />
      <rect x="14" y="33" width="68" height="5" rx="1" fill="#ffffff" />
      {[24, 34, 58, 68].map((x) =>
        [44, 58].map((y) => <rect key={`${x}-${y}`} x={x} y={y} width="5" height="8" rx="1" fill="#b6a3d6" />),
      )}
      {/* doorway with the question */}
      <path d="M40 80 V60 a8 8 0 0 1 16 0 V80 Z" fill="#4f2683" />
      <text x="48" y="76" textAnchor="middle" fontSize="16" fontWeight="800" fill="#d9a520" fontFamily="system-ui, sans-serif">
        ?
      </text>
    </svg>
  );
}
