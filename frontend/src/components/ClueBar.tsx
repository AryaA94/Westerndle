import type { Clue, GameState } from "../types";

/**
 * Free clues for the classic game (type, zone, decade) plus the first-letter hint.
 * Locked clues say how many more guesses they need, so players know what's coming.
 */
export function ClueBar(props: { game: GameState; clues: Clue[]; busy: boolean; onHint: () => void }) {
  const { game, clues, busy, onHint } = props;
  const made = game.guesses.length;
  const hasHint = game.hintAfter !== null;
  const hintIn = (game.hintAfter ?? 0) - made;

  return (
    <section aria-label="Clues" className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-purple-western/10 dark:bg-white/5 dark:ring-white/10">
      <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-widest text-purple-western/70 dark:text-purple-200/70">
        Clues
      </p>
      <div className={`grid gap-2 ${hasHint ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
        {clues.map((c) =>
          c.value ? (
            <ClueChip key={c.key} label={c.label} value={c.value} fresh={c.after === made && made > 0} />
          ) : (
            <Locked key={c.key} label={c.label} guesses={c.after - made} />
          ),
        )}
        {!hasHint ? null : game.hint ? (
          <ClueChip label="Starts with" value={`“${game.hint}”`} gold />
        ) : hintIn > 0 ? (
          <Locked label="First letter" guesses={hintIn} />
        ) : (
          <button
            onClick={onHint}
            disabled={busy}
            className="flex flex-col items-center justify-center rounded-xl bg-gradient-to-br from-[#f0c14b] to-close px-2 py-2 text-center text-purple-deep shadow-md transition hover:brightness-105 disabled:opacity-60"
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">First letter</span>
            <span className="font-display text-sm font-extrabold">💡 Reveal</span>
          </button>
        )}
      </div>
    </section>
  );
}

function ClueChip({ label, value, gold, fresh }: { label: string; value: string; gold?: boolean; fresh?: boolean }) {
  return (
    <div
      className={`${fresh ? "flip-in " : ""}flex flex-col items-center justify-center rounded-xl px-2 py-2 text-center ${
        gold
          ? "bg-gradient-to-br from-[#f0c14b] to-close text-purple-deep shadow-md"
          : "bg-gradient-to-br from-[#6a35ad] to-purple-western text-white shadow-md shadow-purple-western/25"
      }`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider opacity-75">{label}</span>
      <span className="font-display text-sm font-extrabold leading-tight">{value}</span>
    </div>
  );
}

function Locked({ label, guesses }: { label: string; guesses: number }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-purple-western/25 px-2 py-2 text-center text-purple-western/60 dark:border-white/20 dark:text-purple-200/60">
      <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      <span className="text-xs font-bold">
        🔒 {guesses} more {guesses === 1 ? "guess" : "guesses"}
      </span>
    </div>
  );
}
