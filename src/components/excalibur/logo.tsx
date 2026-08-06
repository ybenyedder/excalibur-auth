"use client";

import * as React from "react";

/**
 * Excalibur brand mark — a stylised circular arc + dot, evoking a timer ring.
 * Used on lock/setup screens and as the topbar brand mark.
 */
export function Logo({ className = "", size = 40 }: { className?: string; size?: number }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 36 36"
      aria-hidden="true"
    >
      <g transform="rotate(-90 18 18)">
        <circle
          cx="18"
          cy="18"
          r="15"
          fill="none"
          className="ga-ring-track"
          strokeWidth="2.75"
        />
        <circle
          cx="18"
          cy="18"
          r="15"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.75"
          strokeLinecap="round"
          strokeDasharray="68 97"
        />
      </g>
      <circle cx="18" cy="18" r="2.4" fill="currentColor" />
    </svg>
  );
}
