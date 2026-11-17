import { useEffect, useState } from "react";
import { api } from "../api";

/**
 * The photo-mode picture. Each wrong guess moves to the next level, which zooms out
 * and sharpens. The next image is preloaded before it replaces the current one.
 */
export function PhotoCard({ puzzle, level, levels }: { puzzle: number; level: number; levels: number }) {
  const src = api.photoUrl(puzzle, Math.min(level, levels - 1));
  const [shown, setShown] = useState<string>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.onload = () => !cancelled && setShown(src);
    img.onerror = () => !cancelled && setFailed(true);
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-purple-western/10 dark:bg-white/5 dark:ring-white/10">
      <div className="relative aspect-[4/3] bg-purple-mist dark:bg-white/10">
        {shown ? (
          <img
            key={shown}
            src={shown}
            alt="A zoomed-in part of today's mystery building"
            className="photo-in h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="grid h-full place-items-center text-sm font-semibold text-purple-western/60">
            {failed ? "Couldn't load the photo. Try refreshing." : <span className="animate-pulse">Developing photo…</span>}
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-purple-deep/80 px-3 py-1 text-xs font-bold text-white backdrop-blur">
          📷 Photo #{puzzle}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          {level === 0 ? "Which building is this? Every miss zooms out." : "Zooming out…"}
        </p>
        <ol className="flex shrink-0 gap-1" aria-label={`Zoom level ${level + 1} of ${levels}`}>
          {Array.from({ length: levels }, (_, i) => (
            <li
              key={i}
              className={`h-2 w-2 rounded-full transition ${i <= level ? "bg-purple-western dark:bg-purple-300" : "bg-purple-mist dark:bg-white/15"}`}
            />
          ))}
        </ol>
      </div>
    </section>
  );
}
