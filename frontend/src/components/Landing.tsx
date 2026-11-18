import { useEffect, useState } from "react";
import { api } from "../api";
import { useCountdown } from "../useCountdown";
import type { DailyMeta, GameState, Match, Mode, StreakRun, Yesterday } from "../types";

const WORD = "WESTERNDLE";

/**
 * The main menu, laid out as a board of today's games: a big Daily card that
 * shows your result grid once you've played, a Photo card with today's opening
 * close-up as a teaser, Endless with your streak, and yesterday's answer.
 */
export function Landing(props: {
  daily?: DailyMeta;
  dailyGame?: GameState;
  photoGame?: GameState;
  run: StreakRun;
  onPlay: (mode: Mode) => void;
  onHelp: () => void;
  onStats: () => void;
}) {
  const { daily, dailyGame, photoGame, run, onPlay, onHelp, onStats } = props;
  const countdown = useCountdown();
  const [yesterday, setYesterday] = useState<Yesterday | null>(null);
  useEffect(() => {
    api.yesterday().then(setYesterday).catch(() => {});
  }, []);

  const date = daily
    ? new Date(`${daily.date}T12:00:00`).toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })
    : "";

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 pb-10 pt-6 sm:px-6 sm:pt-10">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <div aria-label="Westerndle" role="img" className="flex gap-[3px]">
            {WORD.split("").map((ch, i) => (
              <span
                key={i}
                aria-hidden="true"
                className={`tile-pop font-display grid h-7 w-6 place-items-center rounded-md text-sm font-extrabold sm:h-8 sm:w-7 sm:text-base ${
                  i < 7 ? "bg-purple-western text-white" : "bg-close text-purple-deep"
                }`}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {ch}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <RoundButton label="Statistics" onClick={onStats}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="3" y="12" width="4" height="9" rx="1" />
                <rect x="10" y="7" width="4" height="14" rx="1" />
                <rect x="17" y="3" width="4" height="18" rx="1" />
              </svg>
            </RoundButton>
            <RoundButton label="How to play" onClick={onHelp}>
              <span className="font-bold">?</span>
            </RoundButton>
          </div>
        </div>

        {/* Heading */}
        <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-purple-western/70 dark:text-purple-200/70">{date}</p>
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-purple-deep sm:text-5xl dark:text-white">
              Today on campus
            </h1>
          </div>
          <p className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-purple-western shadow-sm ring-1 ring-purple-western/10 dark:bg-white/10 dark:text-purple-100 dark:ring-white/10">
            New buildings in <span className="font-mono">{countdown}</span>
          </p>
        </div>

        {/* Board */}
        <div className={`mt-6 grid gap-4 ${daily?.photoMode ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
          <button
            onClick={() => onPlay("daily")}
            className="card-rise group relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#6a35ad] via-purple-western to-purple-deep p-6 text-left text-white shadow-xl shadow-purple-western/20 md:col-span-2 md:row-span-2"
          >
            <div className="hero-pattern absolute inset-0" aria-hidden="true" />
            <div className="relative flex h-full flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-xs">
                <Tag>Daily #{daily?.puzzle ?? "…"}</Tag>
                <h2 className="font-display mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">Today's mystery building</h2>
                <p className="mt-2 text-purple-100">
                  {dailyLine(dailyGame) ?? "Start from a free clue, then follow the distance and arrows."}
                </p>
                <CTA>{dailyGame?.status === "won" || dailyGame?.status === "lost" ? "See your result" : dailyGame?.guesses.length ? "Keep going" : "Play"}</CTA>
              </div>
              <ResultGrid game={dailyGame} />
            </div>
          </button>

          {daily?.photoMode && (
            <button
              onClick={() => onPlay("photo")}
              className="card-rise group relative min-h-64 overflow-hidden rounded-3xl bg-purple-deep text-left text-white shadow-xl md:row-span-2"
              style={{ animationDelay: "80ms" }}
            >
              <img
                src={api.photoUrl(daily.puzzle, photoGame?.status === "playing" || !photoGame ? photoGame?.guesses.length ?? 0 : daily.maxGuesses - 1)}
                alt=""
                className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-purple-deep via-purple-deep/50 to-transparent" />
              <div className="relative flex h-full flex-col justify-end p-6">
                <Tag>📷 Photo #{daily.puzzle}</Tag>
                <h2 className="font-display mt-3 text-2xl font-extrabold leading-tight">Can you name it from this?</h2>
                <p className="mt-1 text-sm text-purple-100">{dailyLine(photoGame) ?? "Every miss zooms out a little more."}</p>
                <CTA>{photoGame?.status === "won" || photoGame?.status === "lost" ? "See the photo" : "Play"}</CTA>
              </div>
            </button>
          )}

          <button
            onClick={() => onPlay("streak")}
            className="card-rise group rounded-3xl bg-white p-6 text-left shadow-md ring-1 ring-purple-western/10 transition hover:shadow-lg dark:bg-white/5 dark:ring-white/10"
            style={{ animationDelay: "160ms" }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-purple-western/70 dark:text-purple-200/70">Endless</p>
                <h2 className="font-display mt-1 text-2xl font-extrabold text-purple-deep dark:text-white">How many in a row?</h2>
              </div>
              <span className="flame text-4xl" aria-hidden="true">🔥</span>
            </div>
            <div className="mt-4 flex gap-6">
              <Stat label="Best" value={run.best} />
              {!run.over && run.current > 0 && <Stat label="Current" value={run.current} />}
            </div>
            <p className="mt-3 text-sm font-bold text-purple-western group-hover:underline dark:text-purple-200">
              {!run.over && run.current > 0 ? "Continue run →" : "Start a run →"}
            </p>
          </button>

          {yesterday && (
            <div
              className={`card-rise flex min-h-36 overflow-hidden rounded-3xl bg-white shadow-md ring-1 ring-purple-western/10 dark:bg-white/5 dark:ring-white/10 ${daily?.photoMode ? "md:col-span-2" : ""}`}
              style={{ animationDelay: "240ms" }}
            >
              {yesterday.photo ? (
                <img src={yesterday.photo} alt={yesterday.name} className="w-2/5 shrink-0 object-cover" loading="lazy" />
              ) : (
                <div className="grid w-2/5 max-w-40 shrink-0 place-items-center bg-purple-mist text-5xl dark:bg-white/10" aria-hidden="true">
                  🏛️
                </div>
              )}
              <div className="flex min-w-0 flex-col justify-center p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-purple-western/70 dark:text-purple-200/70">
                  Yesterday · #{yesterday.puzzle}
                </p>
                <p className="font-display mt-1 text-2xl font-extrabold leading-tight text-purple-deep dark:text-white">{yesterday.name}</p>
                <p className="mt-1 text-sm text-silver">Was that your guess?</p>
              </div>
            </div>
          )}
        </div>

        <p className="mt-10 text-center text-xs text-silver">Fan-made · not affiliated with Western University</p>
      </div>
    </div>
  );
}

function dailyLine(g?: GameState): string | undefined {
  if (!g || g.guesses.length === 0) return undefined;
  if (g.status === "won") return `Solved in ${g.guesses.length}/${g.maxGuesses}. Nice.`;
  if (g.status === "lost") return "Missed this one. New building at midnight.";
  return `${g.maxGuesses - g.guesses.length} guesses left.`;
}

const SQUARE: Record<Match, string> = {
  correct: "bg-white",
  close: "bg-close",
  wrong: "bg-white/15",
};

/** Your guesses as a grid of coloured squares, like a share card. Empty slots before you've played. */
function ResultGrid({ game }: { game?: GameState }) {
  const rows = game?.maxGuesses ?? 8;
  return (
    // On phones the empty grid is just clutter, so it only shows once there's a result.
    <div
      className={`${game?.guesses.length ? "grid" : "hidden sm:grid"} shrink-0 grid-cols-4 gap-1.5 self-start rounded-2xl bg-black/15 p-3 sm:self-center`}
      aria-hidden="true"
    >
      {Array.from({ length: rows }, (_, r) => {
        const g = game?.guesses[r];
        const cells: (Match | null)[] = g ? [g.zone.match, g.category.match, g.yearBuilt.match, g.floors.match] : [null, null, null, null];
        return cells.map((m, c) => (
          <span
            key={`${r}-${c}`}
            className={`h-4 w-4 rounded-[4px] sm:h-5 sm:w-5 ${m ? SQUARE[m] : "border border-dashed border-white/25"}`}
          />
        ));
      })}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="inline-block self-start rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-widest backdrop-blur">{children}</span>;
}

function CTA({ children }: { children: React.ReactNode }) {
  return (
    <span className="mt-5 inline-flex items-center gap-2 self-start rounded-full bg-white px-5 py-2.5 font-bold text-purple-western shadow transition group-hover:gap-3">
      {children} <span aria-hidden="true">→</span>
    </span>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-display text-3xl font-extrabold text-purple-western dark:text-purple-200">{value}</p>
      <p className="text-xs font-semibold text-silver">{label}</p>
    </div>
  );
}

function RoundButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="grid h-10 w-10 place-items-center rounded-full bg-white text-purple-western shadow-sm ring-1 ring-purple-western/10 transition hover:bg-purple-mist dark:bg-white/10 dark:text-purple-100 dark:ring-white/10"
    >
      {children}
    </button>
  );
}
