/**
 * Excalibur — TOTP/HOTP library (RFC 4226 / RFC 6238).
 *
 * Ported to TypeScript from the original vanilla-JS totp.js. Uses WebCrypto
 * (available in the browser and in Node ≥ 20 with a Secure context).
 *
 * Zero dependencies. Pure functions.
 */

const subtle = globalThis.crypto?.subtle;

if (!subtle) {
  // Will surface as a thrown error on first use rather than at import time,
  // so server-side imports of this module don't crash Next.js build.
  console.warn("[excalibur] WebCrypto SubtleCrypto not available in this context.");
}

const B32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

const ALG_MAP: Record<string, "SHA-1" | "SHA-256" | "SHA-512"> = {
  SHA1: "SHA-1",
  SHA256: "SHA-256",
  SHA512: "SHA-512",
  "SHA-1": "SHA-1",
  "SHA-256": "SHA-256",
  "SHA-512": "SHA-512",
};

export interface TotpOptions {
  algorithm?: "SHA-1" | "SHA-256" | "SHA-512";
  digits?: 6 | 7 | 8 | number;
  period?: number;
  timeMs?: number;
}

/** Decode a Base32 string (RFC 4648). Tolerates spaces, dashes, lowercase and padding. */
export function b32decode(input: string): Uint8Array {
  const clean = String(input)
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/=+$/, "");
  if (clean.length === 0) return new Uint8Array(0);
  if (!/^[A-Z2-7]+$/.test(clean)) throw new Error("Invalid Base32 secret");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | B32_ALPHABET.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

/** Normalise a Base32 secret for storage (upper, no spaces/padding). Validates. */
export function normalizeSecret(input: string): string {
  const clean = String(input)
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/=+$/, "");
  b32decode(clean); // throws if invalid
  return clean;
}

/** Format a secret for display: groups of 4, spaced. */
export function formatSecret(secret: string): string {
  const clean = String(secret)
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/=+$/, "");
  return clean.replace(/(.{4})/g, "$1 ").trim();
}

async function hmac(
  algorithm: "SHA-1" | "SHA-256" | "SHA-512",
  keyBytes: Uint8Array,
  msgBytes: Uint8Array
): Promise<Uint8Array> {
  if (!subtle) throw new Error("WebCrypto unavailable");
  const key = await subtle.importKey(
    "raw",
    keyBytes as BufferSource,
    { name: "HMAC", hash: { name: algorithm } },
    false,
    ["sign"]
  );
  const sig = await subtle.sign("HMAC", key, msgBytes as BufferSource);
  return new Uint8Array(sig);
}

/** HOTP code (RFC 4226) for a given counter. */
export async function hotp(
  secretBytes: Uint8Array,
  counter: number,
  opts: TotpOptions = {}
): Promise<string> {
  const algorithm = opts.algorithm || "SHA-1";
  const digits = opts.digits || 6;
  const msg = new Uint8Array(8);
  const view = new DataView(msg.buffer);
  view.setUint32(0, Math.floor(counter / 4294967296));
  view.setUint32(4, counter % 4294967296);
  const h = await hmac(algorithm, secretBytes, msg);
  const offset = h[h.length - 1] & 0x0f;
  const bin =
    ((h[offset] & 0x7f) << 24) |
    (h[offset + 1] << 16) |
    (h[offset + 2] << 8) |
    h[offset + 3];
  return String(bin % 10 ** digits).padStart(digits, "0");
}

/** TOTP counter for a given time (ms). */
export function totpCounter(timeMs: number, period: number): number {
  return Math.floor(timeMs / 1000 / period);
}

/** TOTP code (RFC 6238) for the given time (default: now). */
export async function totp(
  secretBytes: Uint8Array,
  opts: TotpOptions = {}
): Promise<string> {
  const period = opts.period || 30;
  const timeMs = opts.timeMs !== undefined ? opts.timeMs : Date.now();
  return hotp(secretBytes, totpCounter(timeMs, period), opts);
}

/** Fractional seconds remaining in the current window. */
export function secondsRemaining(period: number, timeMs?: number): number {
  const t = (timeMs !== undefined ? timeMs : Date.now()) / 1000;
  return period - (t % period);
}

/** Parse an otpauth://totp/... URI into a normalised account spec. */
export function parseOtpauth(uri: string): ParsedOtpauth {
  let url: URL;
  try {
    url = new URL(String(uri).trim());
  } catch {
    throw new Error("Invalid link");
  }
  if (url.protocol !== "otpauth:") throw new Error("Link must start with otpauth://");
  if (url.host !== "totp") throw new Error("Only TOTP type is supported");

  const label = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  let issuer = url.searchParams.get("issuer") || "";
  let account = label;
  const sep = label.indexOf(":");
  if (sep !== -1) {
    if (!issuer) issuer = label.slice(0, sep).trim();
    account = label.slice(sep + 1).trim();
  }

  const rawSecret = url.searchParams.get("secret") || "";
  if (!rawSecret.trim()) throw new Error("Link has no secret");
  const secret = normalizeSecret(rawSecret);

  const algRaw = (url.searchParams.get("algorithm") || "SHA1").toUpperCase();
  const algorithm = ALG_MAP[algRaw];
  if (!algorithm) throw new Error("Unsupported algorithm: " + algRaw);

  const digits = parseInt(url.searchParams.get("digits") || "6", 10);
  if (![6, 7, 8].includes(digits)) throw new Error("Unsupported digit count (6, 7 or 8)");

  const period = parseInt(url.searchParams.get("period") || "30", 10);
  if (!Number.isInteger(period) || period < 5 || period > 300)
    throw new Error("Invalid period");

  return {
    issuer: issuer.trim(),
    account,
    secret,
    algorithm,
    digits: digits as 6 | 7 | 8,
    period,
  };
}

/** Rebuild an otpauth://totp/... URI from an account spec. */
export function formatOtpauth(acc: {
  issuer: string;
  account: string;
  secret: string;
  algorithm: "SHA-1" | "SHA-256" | "SHA-512";
  digits: 6 | 7 | 8 | number;
  period: number;
}): string {
  const label = encodeURIComponent(
    acc.issuer ? `${acc.issuer}:${acc.account}` : acc.account
  );
  const p = new URLSearchParams();
  p.set("secret", acc.secret);
  if (acc.issuer) p.set("issuer", acc.issuer);
  p.set("algorithm", acc.algorithm.replace("-", ""));
  p.set("digits", String(acc.digits));
  p.set("period", String(acc.period));
  return `otpauth://totp/${label}?${p.toString()}`;
}

/**
 * Split a 6/7/8-digit code into space-separated halves for display
 * (Google Authenticator style: "123 456").
 */
export function splitCode(code: string): [string, string] {
  const half = Math.ceil(code.length / 2);
  return [code.slice(0, half), code.slice(half)];
}

/**
 * Derive a stable, pleasant colour for an issuer — used for the avatar circle.
 * Returns a hue (0–360) deterministically derived from the issuer name.
 */
export function issuerHue(issuer: string): number {
  const s = (issuer || "?").toLowerCase();
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) % 360;
  }
  return h;
}
