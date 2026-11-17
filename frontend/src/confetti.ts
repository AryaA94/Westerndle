import confetti from "canvas-confetti";

/** Purple, gold and white confetti from both sides. Skipped if the player prefers reduced motion. */
export function celebrate() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const colors = ["#4f2683", "#8a5cc9", "#d9a520", "#ffffff"];
  const burst = (x: number, angle: number) =>
    confetti({ particleCount: 70, spread: 65, angle, origin: { x, y: 0.75 }, colors, scalar: 0.9, disableForReducedMotion: true });
  burst(0.1, 60);
  burst(0.9, 120);
  setTimeout(() => confetti({ particleCount: 90, spread: 100, origin: { y: 0.4 }, colors, disableForReducedMotion: true }), 250);
}
