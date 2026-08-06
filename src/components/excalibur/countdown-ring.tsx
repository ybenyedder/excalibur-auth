"use client";

import * as React from "react";

/**
 * Circular countdown ring (SVG). Shows remaining seconds in the centre.
 * Turns red in the last 5 seconds (Material 3 style).
 */
export function CountdownRing({
  period,
  size = 40,
  stroke = 3,
  className = "",
}: {
  period: number;
  size?: number;
  stroke?: number;
  className?: string;
}) {
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    let raf = 0;
    const tick = () => {
      setNow(Date.now());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const t = now / 1000;
  const remaining = period - (t % period);
  const secs = Math.ceil(remaining);
  const frac = remaining / period; // 1 → full ring, 0 → empty
  const warn = remaining <= 5;

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * frac;

  return (
    <span
      className={`relative inline-flex items-center justify-center ${warn ? "ga-ring-warn" : ""} ${className}`}
      style={{ width: size, height: size }}
      aria-label={`${secs} seconds remaining`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: "rotate(-90deg)" }}
        aria-hidden="true"
      >
        <circle
          className="ga-ring-track"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
        />
        <circle
          className="ga-ring-fill"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
        />
      </svg>
      <span
        className="ga-ring-sec tnum absolute font-medium tabular-nums"
        style={{
          fontSize: Math.max(11, size * 0.3),
        }}
      >
        {secs}
      </span>
    </span>
  );
}
