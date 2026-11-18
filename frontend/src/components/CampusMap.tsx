import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Answer, Feedback } from "../types";

const PURPLE = "#4f2683";

// Numbered circle markers drawn with HTML, so there are no marker image files to bundle.
function pin(label: string, answer: boolean) {
  const size = answer ? 30 : 22;
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;display:grid;place-items:center;
      font:700 ${answer ? 14 : 11}px system-ui,sans-serif;color:#fff;border:2px solid #fff;
      box-shadow:0 1px 4px rgba(0,0,0,.4);background:${answer ? PURPLE : "#807f83"}">${label}</div>`,
  });
}

/** End-of-game map: the answer, every guess, and a dashed line from each guess to the answer. */
export default function CampusMap({ answer, guesses }: { answer: Answer; guesses: Feedback[] }) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!el.current) return;
    const map = L.map(el.current, { scrollWheelZoom: false, attributionControl: true });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const target: L.LatLngTuple = [answer.lat, answer.lon];
    const points: L.LatLngTuple[] = [target];
    guesses.forEach((g, i) => {
      // Games saved before the map existed have no coordinates for their guesses.
      if (g.correct || typeof g.lat !== "number" || typeof g.lon !== "number") return;
      const p: L.LatLngTuple = [g.lat, g.lon];
      points.push(p);
      L.polyline([p, target], { color: PURPLE, weight: 2, opacity: 0.5, dashArray: "4 6" }).addTo(map);
      L.marker(p, { icon: pin(String(i + 1), false), title: g.name }).addTo(map).bindTooltip(`${i + 1}. ${g.name}`);
    });
    L.marker(target, { icon: pin("★", true), title: answer.name, zIndexOffset: 1000 })
      .addTo(map)
      .bindTooltip(answer.name, { permanent: guesses.length <= 1, direction: "top", offset: [0, -14] });

    if (points.length === 1) map.setView(target, 17);
    else map.fitBounds(L.latLngBounds(points), { padding: [28, 28], maxZoom: 17 });

    return () => {
      map.remove();
    };
  }, [answer, guesses]);

  return <div ref={el} className="h-64 w-full overflow-hidden rounded-lg" role="img" aria-label={`Map showing ${answer.name} and your guesses`} />;
}
