import { useEffect, useState } from "react";

/** Time left until the next puzzle (midnight in London, Ontario), as HH:MM:SS. */
export function useCountdown() {
  const [left, setLeft] = useState("");
  useEffect(() => {
    const tick = () => {
      // Next midnight in London, Ontario.
      const now = new Date();
      const campus = new Date(now.toLocaleString("en-US", { timeZone: "America/Toronto" }));
      const next = new Date(campus);
      next.setHours(24, 0, 0, 0);
      const s = Math.max(0, Math.floor((next.getTime() - campus.getTime()) / 1000));
      const pad = (n: number) => String(n).padStart(2, "0");
      setLeft(`${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return left;
}
