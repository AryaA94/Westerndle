import { useId, useMemo, useState } from "react";
import { searchBuildings } from "../logic";
import type { BuildingName } from "../types";

export function GuessInput(props: {
  buildings: BuildingName[];
  guessed: Set<string>;
  disabled: boolean;
  onGuess: (id: string) => void;
}) {
  const { buildings, guessed, disabled, onGuess } = props;
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();
  const matches = useMemo(() => searchBuildings(buildings, query, guessed), [buildings, query, guessed]);

  const submit = (b?: BuildingName) => {
    if (!b) return;
    onGuess(b.id);
    setQuery("");
    setActive(0);
  };

  return (
    <div className="relative">
      <svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-purple-western/60 dark:text-purple-200/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
      <input
        type="text"
        value={query}
        disabled={disabled}
        placeholder={disabled ? "Game over — come back tomorrow" : "Guess a building (e.g. UCC, Weldon)…"}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            submit(matches[active]);
          } else if (e.key === "Escape") {
            setQuery("");
          }
        }}
        role="combobox"
        aria-expanded={matches.length > 0}
        aria-controls={listId}
        aria-activedescendant={matches[active] ? `${listId}-${matches[active].id}` : undefined}
        aria-label="Guess a building"
        autoComplete="off"
        className="w-full rounded-2xl border-2 border-purple-western/20 bg-white py-4 pl-12 pr-4 text-base shadow-md outline-none transition placeholder:text-neutral-400 focus:border-purple-western focus:ring-4 focus:ring-purple-western/15 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-white/5"
      />
      {matches.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-purple-western/15 bg-white py-1 shadow-xl dark:bg-[#22133a]"
        >
          {matches.map((b, i) => (
            <li
              key={b.id}
              id={`${listId}-${b.id}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                submit(b);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-baseline justify-between gap-3 px-4 py-2 ${
                i === active ? "bg-purple-mist dark:bg-purple-western/40" : ""
              }`}
            >
              <span>{b.name}</span>
              {b.aliases[0] && <span className="text-xs font-semibold text-silver">{b.aliases[0]}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
