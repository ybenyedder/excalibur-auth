/**
 * Excalibur — encrypted vault (AES-256-GCM, PBKDF2-SHA256 600k iterations).
 *
 * Ported to TypeScript from the original vanilla-JS vault.js. All crypto runs
 * client-side via WebCrypto. The derived key never leaves the browser.
 */

import type { VaultBlob, VaultPayload } from "./types";

const subtle = globalThis.crypto?.subtle;
const enc = new TextEncoder();
const dec = new TextDecoder();

export const PBKDF2_ITERATIONS = 600_000;
export const STORAGE_KEY = "excalibur.vault.v1";

const b64 = {
  encode(bytes: Uint8Array): string {
    let s = "";
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s);
  },
  decode(str: string): Uint8Array {
    const s = atob(str);
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  },
};

export function randomBytes(n: number): Uint8Array {
  const bytes = new Uint8Array(n);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

function hex(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += b.toString(16).padStart(2, "0");
  return s;
}

/** Derive the AES-256-GCM key from the passphrase. Key is non-extractible. */
export async function deriveKey(
  password: string,
  saltBytes: Uint8Array,
  iterations: number
): Promise<CryptoKey> {
  if (!subtle) throw new Error("WebCrypto unavailable");
  const base = await subtle.importKey("raw", enc.encode(password) as BufferSource, "PBKDF2", false, [
    "deriveKey",
  ]);
  return subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: saltBytes as BufferSource, iterations },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export interface DerivedKeys {
  key: CryptoKey;
  /** Hex-encoded auth token (bytes 32–63). Server stores only its SHA-256 hash. */
  authToken: string;
}

/**
 * Derive in a single PBKDF2 call (512 bits):
 *  - bytes 0–31: AES-256-GCM key (identical to deriveKey — backwards-compatible)
 *  - bytes 32–63: auth token sent to the server in profile mode.
 * The server only ever sees the token (and stores only its hash), so it can never
 * reconstruct the encryption key.
 */
export async function deriveKeys(
  password: string,
  saltBytes: Uint8Array,
  iterations: number
): Promise<DerivedKeys> {
  if (!subtle) throw new Error("WebCrypto unavailable");
  const base = await subtle.importKey("raw", enc.encode(password) as BufferSource, "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = new Uint8Array(
    await subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt: saltBytes as BufferSource, iterations },
      base,
      512
    )
  );
  const key = await subtle.importKey(
    "raw",
    bits.slice(0, 32) as BufferSource,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
  const authToken = hex(bits.slice(32));
  bits.fill(0);
  return { key, authToken };
}

/** SHA-256 hex hash of the auth token (what the server stores). */
export async function hashToken(authToken: string): Promise<string> {
  if (!subtle) throw new Error("WebCrypto unavailable");
  const buf = await subtle.digest("SHA-256", enc.encode(authToken) as BufferSource);
  return hex(new Uint8Array(buf));
}

/** Encrypt the payload and return a serialisable vault blob. Fresh IV each seal. */
export async function sealVault(
  key: CryptoKey,
  saltB64: string,
  iterations: number,
  payload: VaultPayload
): Promise<VaultBlob> {
  if (!subtle) throw new Error("WebCrypto unavailable");
  const iv = randomBytes(12);
  const data = await subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    enc.encode(JSON.stringify(payload)) as BufferSource
  );
  return {
    app: "excalibur",
    version: 1,
    kdf: { algo: "PBKDF2", hash: "SHA-256", iterations, salt: saltB64 },
    cipher: { algo: "AES-256-GCM", iv: b64.encode(iv) },
    data: b64.encode(new Uint8Array(data)),
  };
}

/** Decrypt a vault blob. Throws if the passphrase is wrong or data was tampered (GCM). */
export async function openVault(key: CryptoKey, blob: VaultBlob): Promise<VaultPayload> {
  if (!subtle) throw new Error("WebCrypto unavailable");
  const iv = b64.decode(blob.cipher.iv);
  const data = b64.decode(blob.data);
  const plain = await subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    data as BufferSource
  );
  return JSON.parse(dec.decode(plain)) as VaultPayload;
}

/** Validate the shape of a vault blob (for import). */
export function isVaultShape(obj: unknown): obj is VaultBlob {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return Boolean(
    o.app === "excalibur" &&
      o.version === 1 &&
      o.kdf &&
      (o.kdf as Record<string, unknown>)?.algo === "PBKDF2" &&
      typeof (o.kdf as Record<string, unknown>)?.salt === "string" &&
      Number.isInteger((o.kdf as Record<string, unknown>)?.iterations) &&
      (o.kdf as Record<string, unknown>).iterations as number >= 100_000 &&
      o.cipher &&
      typeof (o.cipher as Record<string, unknown>)?.iv === "string" &&
      typeof (o.cipher as Record<string, unknown>)?.data === "string"
  );
}

const hasStorage = typeof localStorage !== "undefined";

export function loadStored(): VaultBlob | null {
  if (!hasStorage) return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    return isVaultShape(obj) ? obj : null;
  } catch {
    return null;
  }
}

export function saveStored(blob: VaultBlob): void {
  if (!hasStorage) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(blob));
}

export function clearStored(): void {
  if (!hasStorage) return;
  localStorage.removeItem(STORAGE_KEY);
}

/** Generate a new random salt (16 bytes) as base64. */
export function newSaltB64(): string {
  return b64.encode(randomBytes(16));
}

export function saltFromB64(salt: string): Uint8Array {
  return b64.decode(salt);
}

/** Generate a short, URL-safe random id. */
export function newId(): string {
  const bytes = randomBytes(9);
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (const b of bytes) s += alphabet[b % alphabet.length];
  return s;
}

export const vaultB64 = b64;
