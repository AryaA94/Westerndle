import { useEffect, useState } from "react";
import { api } from "../api";
import type { DailyMeta, GameState, Mode, ShowcasePhoto, StreakRun } from "../types";

const WORD = "WESTERNDLE";
// Where each snapshot sits on wide screens: [left or right %, top %, tilt].
const SPOTS: [string, number, number][] = [
  ["left:4%", 8, -7],
  ["left:16%", 38, 5],
  ["left:4%", 66, -3],
  ["right:5%", 8, 6],
  ["right:16%", 37, -5],
  ["right:4%", 65, 4],
];

/** The main menu: logo, a button per mode with today's status, and real campus photos taped around it. */
export function Landing(props: {
  daily?: DailyMeta;
  dailyGame?: GameState;
  photoGame?: GameState;
  run: StreakRun;
  onPlay: (mode: Mode) => void;
  onHelp: () => void;
}) {
  const { daily, dailyGame, photoGame, run, onPlay, onHelp } = props;
  const [photos, setPhotos] = useState<ShowcasePhoto[]>([]);
  useEffect(() => {
    api.showcase().then(setPhotos).catch(() => {});
  }, []);

  return (
    <div className="hero-pattern relative min-h-screen overflow-hidden bg-gradient-to-br from-[#6a35ad] via-purple-western to-purple-deep text-white">
      {/* Snapshots around the edges on wide screens. */}
      <div className="pointer-events-none absolute inset-0 hidden xl:block" aria-hidden="true">
        {photos.slice(0, SPOTS.length).map((p, i) => {
          const [side, top, tilt] = SPOTS[i];
          const [prop, val] = side.split(":");
          return (
            <div key={p.id} className="snap-in absolute" style={{ [prop]: val, top: `${top}%`, animationDelay: `${150 + i * 90}ms` }}>
              <Snapshot photo={p} tilt={tilt} />
            </div>
          );
        })}
      </div>

      <main className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 py-10 text-center">
        {/* On phones, three snapshots fan out above the logo. */}
        {photos.length >= 3 && (
          <div className="mb-6 flex justify-center xl:hidden" aria-hidden="true">
            {photos.slice(0, 3).map((p, i) => (
              <div key={p.id} className="snap-in -mx-1" style={{ animationDelay: `${100 + i * 90}ms`, zIndex: i === 1 ? 2 : 1 }}>
                <Snapshot photo={p} tilt={[-8, 2, 9][i]} small />
              </div>
            ))}
          </div>
        )}

        <h1 aria-label="Westerndle" className="flex gap-1 sm:gap-1.5">
          {WORD.split("").map((ch, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={`tile-pop font-display grid h-9 w-8 place-items-center rounded-lg text-xl font-extrabold shadow-lg sm:h-12 sm:w-10 sm:text-2xl ${
                i < 7 ? "bg-white text-purple-western" : "bg-close text-purple-deep"
              }`}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {ch}
            </span>
          ))}
        </h1>
        <p className="mt-4 text-lg font-medium text-purple-100">Guess the Western campus building.</p>

        <div className="mt-8 flex w-full flex-col gap-3">
          <MenuButton
            primary
            title={`Daily${daily ? ` #${daily.puzzle}` : ""}`}
            sub={status(dailyGame, "Today's building")}
            onClick={() => onPlay("daily")}
          />
          {daily?.photoMode && (
            <MenuButton title="📷 Photo" sub={status(photoGame, "Name it from a close-up")} onClick={() => onPlay("photo")} />
          )}
          <MenuButton
            title="🔥 Endless"
            sub={run.best > 0 ? `Best streak: ${run.best}${!run.over && run.current > 0 ? ` · current ${run.current}` : ""}` : "How many in a row?"}
            onClick={() => onPlay("streak")}
          />
          <button onClick={onHelp} className="mt-1 text-sm font-semibold text-purple-200 underline-offset-4 hover:text-white hover:underline">
            How to play
          </button>
        </div>

        <p className="mt-10 text-xs text-purple-200/80">Fan-made · not affiliated with Western University</p>
      </main>
    </div>
  );
}

function status(g: GameState | undefined, fresh: string): string {
  if (!g || g.guesses.length === 0) return fresh;
  if (g.status === "won") return `✓ Solved in ${g.guesses.length}`;
  if (g.status === "lost") return "✗ Missed today. Back tomorrow";
  return `In progress · ${g.maxGuesses - g.guesses.length} guesses left`;
}

function MenuButton(props: { title: string; sub: string; primary?: boolean; onClick: () => void }) {
  const { title, sub, primary, onClick } = props;
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center justify-between rounded-2xl px-5 py-4 text-left shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl ${
        primary ? "bg-white text-purple-deep" : "bg-white/10 text-white ring-1 ring-white/25 backdrop-blur hover:bg-white/15"
      }`}
    >
      <span>
        <span className="font-display block text-lg font-extrabold">{title}</span>
        <span className={`block text-sm ${primary ? "text-purple-western/70" : "text-purple-200"}`}>{sub}</span>
      </span>
      <span className={`text-xl transition group-hover:translate-x-1 ${primary ? "text-purple-western" : "text-white/70"}`}>→</span>
    </button>
  );
}

/** A taped-up photo print with the building's name written underneath. */
function Snapshot({ photo, tilt, small }: { photo: ShowcasePhoto; tilt: number; small?: boolean }) {
  return (
    <figure
      className={`relative rounded-sm bg-[#fbf8f2] shadow-xl shadow-black/30 ${small ? "w-28 p-1.5 pb-5" : "w-52 p-2.5 pb-8"}`}
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      {/* gold tape */}
      <span
        className={`absolute left-1/2 -translate-x-1/2 rotate-[-4deg] bg-close/70 ${small ? "-top-2 h-3 w-10" : "-top-3 h-5 w-16"}`}
      />
      <img src={photo.photo} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" />
      <figcaption
        className={`absolute inset-x-0 truncate text-center font-display font-semibold text-purple-deep/80 ${small ? "bottom-1 px-1.5 text-[9px]" : "bottom-2 px-2 text-xs"}`}
      >
        {photo.name}
      </figcaption>
    </figure>
  );
}
