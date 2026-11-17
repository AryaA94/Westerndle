import { DIRECTION_DEGREES, formatDistance } from "../logic";
import type { Feedback } from "../types";
import { Tile } from "./Tile";

export function GuessRow({ g, index }: { g: Feedback; index: number }) {
  return (
    <li
      className={`overflow-hidden rounded-2xl bg-white shadow-sm ring-1 dark:bg-white/5 ${
        g.correct ? "ring-2 ring-purple-western dark:ring-purple-300" : "ring-purple-western/10 dark:ring-white/10"
      }`}
    >
      <div className="flex items-center justify-between gap-3 px-3 pt-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-purple-mist text-xs font-bold text-purple-western dark:bg-white/10 dark:text-purple-200">
            {index + 1}
          </span>
          <span className="font-display truncate text-base font-bold sm:text-lg">{g.name}</span>
        </div>
        {g.correct ? (
          <span className="shrink-0 rounded-full bg-purple-western px-3 py-1 text-xs font-bold text-white">🎓 Got it!</span>
        ) : (
          <div className="flex shrink-0 items-center gap-2">
            <span className="font-display text-sm font-bold text-purple-western dark:text-purple-200">{formatDistance(g.distanceM)}</span>
            <span
              className="grid h-8 w-8 place-items-center rounded-full bg-purple-western text-white shadow"
              role="img"
              aria-label={`answer is to the ${g.direction}`}
              title={`Answer is to the ${g.direction}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" style={{ transform: `rotate(${DIRECTION_DEGREES[g.direction ?? "N"]}deg)` }} aria-hidden="true">
                <path d="M12 2 L20 20 L12 15 L4 20 Z" fill="currentColor" />
              </svg>
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-1.5 p-3 sm:gap-2 sm:px-4">
        <Tile label="Zone" value={g.zone.value} match={g.zone.match} delay={0} />
        <Tile label="Type" value={g.category.value} match={g.category.match} delay={90} />
        <Tile label="Built" value={g.yearBuilt.value} match={g.yearBuilt.match} hint={g.yearBuilt.hint} delay={180} />
        <Tile label="Floors" value={g.floors.value} match={g.floors.match} hint={g.floors.hint} delay={270} />
      </div>

      {/* How close this guess is, across campus. */}
      <div className="flex items-center gap-2 px-3 pb-3 sm:px-4" aria-label={`${g.proximity}% close`}>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-purple-mist dark:bg-white/10">
          <div
            className="grow-x h-full rounded-full bg-gradient-to-r from-[#8a5cc9] to-purple-western"
            style={{ width: `${g.proximity}%`, animationDelay: "350ms" }}
          />
        </div>
        <span className="w-10 text-right text-xs font-bold text-purple-western dark:text-purple-200">{g.proximity}%</span>
      </div>
    </li>
  );
}
