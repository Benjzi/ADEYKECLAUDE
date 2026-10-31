import { useEffect, useState } from "react";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

/** Live "time until" tiles. Renders nothing once the moment has passed. */
export function Countdown({ to, className = "" }: { to: string; className?: string }) {
  const target = new Date(to).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  if (now === null || target <= now) return null;
  const p = parts(target - now);
  const cells: [number, string][] = [
    [p.d, "days"],
    [p.h, "hours"],
    [p.m, "min"],
    [p.s, "sec"],
  ];
  return (
    <div
      className={`flex gap-2 ${className}`}
      role="timer"
      aria-label="Time until the event starts"
    >
      {cells.map(([v, l]) => (
        <div
          key={l}
          className="min-w-[3.6rem] rounded-xl bg-white/15 px-3 py-2 text-center backdrop-blur"
        >
          <div className="font-heading text-2xl font-bold tabular-nums leading-none">
            {String(v).padStart(2, "0")}
          </div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-widest opacity-80">
            {l}
          </div>
        </div>
      ))}
    </div>
  );
}
