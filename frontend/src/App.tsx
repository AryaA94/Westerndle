import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { ClueBar } from "./components/ClueBar";
import { EndCard } from "./components/EndCard";
import { GuessInput } from "./components/GuessInput";
import { GuessRow } from "./components/GuessRow";
import { Header } from "./components/Header";
import { MysteryCard } from "./components/MysteryCard";
import { PhotoCard } from "./components/PhotoCard";
import { HelpModal } from "./components/HelpModal";
import { StatsModal } from "./components/StatsModal";
import { applyResult } from "./logic";
import { celebrate } from "./confetti";
import { storage } from "./storage";
import type { BuildingName, Clue, DailyMeta, DailyMode, GameState, Mode } from "./types";

export default function App() {
  const [buildings, setBuildings] = useState<BuildingName[]>([]);
  const [daily, setDaily] = useState<DailyMeta>();
  const [mode, setMode] = useState<Mode>("daily");
  const [game, setGame] = useState<GameState>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [clues, setClues] = useState<Clue[]>([]);
  const [modal, setModal] = useState<"help" | "stats" | null>(storage.seenHelp() ? null : "help");

  useEffect(() => {
    Promise.all([api.buildings(), api.daily()])
      .then(([b, d]) => {
        setBuildings(b);
        setDaily(d);
      })
      .catch(() => setError("Couldn't reach the server. Try refreshing."));
  }, []);

  const newPractice = useCallback(async () => {
    const { token, maxGuesses, hintAfter } = await api.newPractice();
    const g: GameState = { mode: "practice", token, maxGuesses, hintAfter, guesses: [], status: "playing" };
    storage.savePracticeGame(g);
    setGame(g);
  }, []);

  // Load (or start) the game for the selected mode.
  useEffect(() => {
    if (!daily) return;
    if (mode !== "practice") {
      setGame(
        storage.dailyGame(mode, daily.puzzle) ?? {
          mode, puzzle: daily.puzzle, maxGuesses: daily.maxGuesses, hintAfter: daily.hintAfter, guesses: [], status: "playing",
        },
      );
    } else {
      const saved = storage.practiceGame();
      if (saved && saved.status === "playing") setGame(saved);
      else newPractice().catch(() => setError("Couldn't start a practice game."));
    }
  }, [mode, daily, newPractice]);

  // Refresh the free clues whenever the guess count changes (classic modes only).
  const made = game?.guesses.length ?? 0;
  useEffect(() => {
    if (!game || game.mode === "photo" || game.status !== "playing") return setClues([]);
    let cancelled = false;
    api
      .clues({ mode: game.mode, puzzle: game.puzzle, token: game.token }, made)
      .then((c) => !cancelled && setClues(c))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [game?.mode, game?.puzzle, game?.token, game?.status, made]); // eslint-disable-line react-hooks/exhaustive-deps

  const guessed = useMemo(() => new Set(game?.guesses.map((g) => g.buildingId)), [game]);

  const save = (g: GameState) => {
    setGame(g);
    if (g.mode !== "practice") storage.saveDailyGame(g);
    else storage.savePracticeGame(g);
  };

  const onGuess = async (buildingId: string) => {
    if (!game || game.status !== "playing" || busy) return;
    setBusy(true);
    setError(undefined);
    const ref = { mode: game.mode, puzzle: game.puzzle, token: game.token };
    try {
      const fb = await api.guess(ref, buildingId);
      const guesses = [...game.guesses, fb];
      let next: GameState = { ...game, guesses };
      if (fb.correct) {
        next.status = "won";
      } else if (guesses.length >= game.maxGuesses) {
        next = { ...next, status: "lost", answer: await api.reveal(ref, guesses.length) };
      }
      // A win needs the answer's coordinates for the map link too.
      if (next.status === "won") next.answer = await api.reveal(ref, game.maxGuesses).catch(() => undefined);
      save(next);
      if (next.status === "won") celebrate();
      if (next.status !== "playing" && next.mode !== "practice" && next.puzzle) {
        const won = next.status === "won";
        api.recordResult(next.mode, next.puzzle, won, guesses.length).catch(() => {});
        storage.saveStats(next.mode, applyResult(storage.stats(next.mode, game.maxGuesses), next.puzzle, won, guesses.length));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const onHint = async () => {
    if (!game || busy) return;
    setBusy(true);
    try {
      const { firstLetter } = await api.hint({ mode: game.mode, puzzle: game.puzzle, token: game.token }, game.guesses.length);
      save({ ...game, hint: firstLetter });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't get a hint.");
    } finally {
      setBusy(false);
    }
  };

  const closeModal = () => {
    if (modal === "help") storage.markHelpSeen();
    setModal(null);
  };

  const left = game ? game.maxGuesses - game.guesses.length : 0;
  // Practice has no stats of its own; show the classic ones there.
  const statsMode: DailyMode = mode === "photo" ? "photo" : "daily";

  return (
    <div className="min-h-screen">
      <Header onHelp={() => setModal("help")} onStats={() => setModal("stats")} />

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        <div className="flex rounded-full bg-white p-1 shadow-sm ring-1 ring-purple-western/10 dark:bg-white/10 dark:ring-white/10" role="tablist">
          {(daily?.photoMode ? (["daily", "photo", "practice"] as const) : (["daily", "practice"] as const)).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`flex-1 rounded-full py-2.5 text-sm font-bold transition ${
                mode === m ? "bg-purple-western text-white shadow-md" : "text-purple-western hover:bg-purple-mist dark:text-purple-200 dark:hover:bg-white/10"
              }`}
            >
              {m === "daily" ? `Daily${daily ? ` #${daily.puzzle}` : ""}` : m === "photo" ? "📷 Photo" : "Practice"}
            </button>
          ))}
        </div>

        {game && (
          <>
            {game.mode === "photo" && game.puzzle && game.status === "playing" && (
              <PhotoCard puzzle={game.puzzle} level={game.guesses.length} levels={game.maxGuesses} />
            )}
            {game.mode !== "photo" && game.status === "playing" && game.guesses.length === 0 && (
              <MysteryCard mode={game.mode} puzzle={game.puzzle} />
            )}
            {game.status === "playing" ? (
              <>
                {game.mode !== "photo" && clues.length > 0 && <ClueBar game={game} clues={clues} busy={busy} onHint={onHint} />}
                <GuessInput buildings={buildings} guessed={guessed} disabled={busy} onGuess={onGuess} />
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-silver">
                    {left} {left === 1 ? "guess" : "guesses"} left
                  </p>
                  {game.mode === "photo" && <HintBadge game={game} busy={busy} onHint={onHint} />}
                </div>
              </>
            ) : (
              <EndCard game={game} onNewPractice={() => newPractice().catch(() => setError("Couldn't start a practice game."))} />
            )}

            {error && <p role="alert" className="rounded-lg bg-red-100 px-4 py-2 text-sm text-red-800">{error}</p>}

            <ol className="space-y-3">
              {game.guesses.map((g, i) => ({ g, i })).reverse().map(({ g, i }) => (
                <GuessRow key={g.buildingId} g={g} index={i} />
              ))}
            </ol>
          </>
        )}
        {!game && !error && <p className="animate-pulse py-10 text-center font-display text-lg font-bold text-purple-western/60">Loading today\u2019s building…</p>}
        {!game && error && <p role="alert" className="rounded-lg bg-red-100 px-4 py-2 text-sm text-red-800">{error}</p>}
      </main>

      <footer className="pb-8 text-center text-xs text-silver">Fan-made · not affiliated with Western University</footer>

      {modal === "help" && <HelpModal maxGuesses={daily?.maxGuesses ?? 8} onClose={closeModal} />}
      {modal === "stats" && (
        <StatsModal title={statsMode === "photo" ? "Photo stats" : "Your stats"} stats={storage.stats(statsMode, daily?.maxGuesses ?? 8)} onClose={closeModal} />
      )}
    </div>
  );
}

/** Locked until hintAfter misses, then a button, then the letter itself. */
function HintBadge({ game, busy, onHint }: { game: GameState; busy: boolean; onHint: () => void }) {
  const base = "rounded-full px-3 py-1 text-xs font-bold";
  if (game.hint)
    return <span className={`${base} bg-close text-purple-deep`}>Hint: starts with “{game.hint}”</span>;
  const needed = (game.hintAfter ?? 5) - game.guesses.length;
  if (needed > 0)
    return (
      <span className={`${base} bg-purple-mist text-purple-western/70 dark:bg-white/10 dark:text-purple-200/70`}>
        🔒 Hint in {needed} {needed === 1 ? "guess" : "guesses"}
      </span>
    );
  return (
    <button onClick={onHint} disabled={busy} className={`${base} bg-purple-western text-white hover:bg-purple-deep disabled:opacity-60`}>
      💡 Show first letter
    </button>
  );
}
