import type { Hint, Match } from "../types";

const STYLES: Record<Match, string> = {
  correct: "bg-gradient-to-br from-[#6a35ad] to-purple-western text-white shadow-md shadow-purple-western/30",
  close: "bg-gradient-to-br from-[#f0c14b] to-close text-purple-deep shadow-md shadow-close/30",
  wrong: "bg-white text-neutral-600 ring-1 ring-neutral-200 dark:bg-white/5 dark:text-neutral-300 dark:ring-white/15",
};

// Spelled out for screen readers, since colour alone carries the result.
const LABEL: Record<Match, string> = { correct: "correct", close: "close", wrong: "not a match" };

export function Tile(props: { label: string; value: string | number; match: Match; hint?: Hint; delay?: number }) {
  const { label, value, match, hint, delay = 0 } = props;
  const arrow = hint === "higher" ? "▲" : hint === "lower" ? "▼" : "";
  return (
    <div
      className={`flip-in flex min-h-[4.25rem] flex-col items-center justify-center rounded-xl px-1 py-2 text-center ${STYLES[match]}`}
      style={{ animationDelay: `${delay}ms` }}
      aria-label={`${label}: ${value}, ${LABEL[match]}${hint ? `, answer is ${hint}` : ""}`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{label}</span>
      <span className="font-display text-[13px] font-extrabold leading-tight sm:text-sm">
        {value}
        {arrow && <span className="ml-0.5 text-[11px]">{arrow}</span>}
      </span>
    </div>
  );
}
