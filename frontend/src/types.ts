export type Match = "correct" | "close" | "wrong";
export type Hint = "higher" | "lower" | null;
/** "daily" is the classic daily puzzle, "photo" the daily photo puzzle, "streak" endless mode. */
export type Mode = "daily" | "photo" | "streak";
export type DailyMode = Exclude<Mode, "streak">;

/** An endless run: buildings back to back until one is missed. */
export interface StreakRun {
  current: number;
  best: number;
  /** Buildings already used this run, so they don't repeat. */
  seen: string[];
  over: boolean;
  game?: GameState;
}

/** Yesterday's classic answer, shown on the menu. */
export interface Yesterday {
  puzzle: number;
  id: string;
  name: string;
  photo: string | null;
}

export interface BuildingName {
  id: string;
  name: string;
  aliases: string[];
}

export interface Feedback {
  buildingId: string;
  name: string;
  correct: boolean;
  zone: { value: string; match: Match };
  category: { value: string; match: Match };
  yearBuilt: { value: number; match: Match; hint: Hint };
  floors: { value: number; match: Match; hint: Hint };
  distanceM: number;
  direction: string | null;
  proximity: number;
  photo: string | null;
  lat: number;
  lon: number;
}

export interface Answer {
  id: string;
  name: string;
  lat: number;
  lon: number;
  photo: string | null;
  photoCredit: string | null;
  photoSource: string | null;
}

/** A free clue about the answer; value is null until enough guesses are made. */
export interface Clue {
  key: string;
  label: string;
  after: number;
  value: string | null;
}

export interface DailyMeta {
  puzzle: number;
  date: string;
  maxGuesses: number;
  hintAfter: number;
  /** Whether the server has building photos, so photo mode can be offered. */
  photoMode: boolean;
}

export interface GlobalStats {
  puzzle: number;
  plays: number;
  wins: number;
  distribution: number[];
}

/** A game in progress or finished, as saved in localStorage. */
export interface GameState {
  mode: Mode;
  puzzle?: number;
  token?: string;
  maxGuesses: number;
  hintAfter: number;
  /** First letter of the answer, once the player has asked for it. */
  hint?: string;
  guesses: Feedback[];
  answer?: Answer;
  status: "playing" | "won" | "lost";
}
