import type { DailyMode, GameState, StreakRun } from "./types";
import { emptyStats, type LocalStats } from "./logic";

// Browsers can block storage (private mode etc.); the game still works, it just forgets.
function read<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export const storage = {
  dailyGame: (mode: DailyMode, puzzle: number) => read<GameState>(`westerndle:${mode}:${puzzle}`),
  saveDailyGame: (g: GameState) => write(`westerndle:${g.mode}:${g.puzzle}`, g),
  streak: (): StreakRun => read<StreakRun>("westerndle:streak") ?? { current: 0, best: 0, seen: [], over: false },
  saveStreak: (r: StreakRun) => write("westerndle:streak", r),
  // Classic stats keep their original key so existing streaks carry over.
  stats: (mode: DailyMode, maxGuesses: number) => read<LocalStats>(statsKey(mode)) ?? emptyStats(maxGuesses),
  saveStats: (mode: DailyMode, s: LocalStats) => write(statsKey(mode), s),
  seenHelp: () => read<boolean>("westerndle:seen-help") ?? false,
  markHelpSeen: () => write("westerndle:seen-help", true),
};

function statsKey(mode: DailyMode) {
  return mode === "daily" ? "westerndle:stats" : `westerndle:stats:${mode}`;
}
