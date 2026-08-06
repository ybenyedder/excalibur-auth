"use client";

import * as React from "react";
import { issuerHue } from "@/lib/totp";

/**
 * Issuer avatar — a coloured circle with the issuer's first letter (or a
 * fallback icon). Colours are deterministically derived from the issuer name,
 * like Google Authenticator's per-service tints.
 *
 * Uses a Material You tonal palette: light tinted fill, deep ink letter,
 * subtle mid-tone ring — looks good on both light and dark surfaces.
 */
export function IssuerAvatar({
  issuer,
  account,
  size = 44,
  className = "",
}: {
  issuer: string;
  account?: string;
  size?: number;
  className?: string;
}) {
  const label = (issuer || account || "?").trim();
  const letter = label.charAt(0).toUpperCase() || "?";
  const hue = issuerHue(label);

  // Material You tonal palette derived from the issuer hue.
  const bg = `hsl(${hue} 70% 90%)`;
  const fg = `hsl(${hue} 65% 28%)`;
  const ring = `hsl(${hue} 55% 70%)`;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${className}`}
      style={{
        width: size,
        height: size,
        background: bg,
        color: fg,
        fontSize: size * 0.42,
        boxShadow: `inset 0 0 0 1.5px ${ring}`,
      }}
      aria-hidden="true"
    >
      {letter}
    </span>
  );
}
