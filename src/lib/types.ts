/**
 * Excalibur — shared types.
 */

/** A single TOTP/HOTP account stored inside the encrypted vault. */
export interface Account {
  /** Stable id (cuid-like, generated client-side). */
  id: string;
  /** Issuer / service name, e.g. "GitHub". May be empty. */
  issuer: string;
  /** Account label, e.g. "alice@example.com". */
  account: string;
  /** Base32-encoded secret (normalised: upper, no padding/spaces). */
  secret: string;
  /** HMAC algorithm. */
  algorithm: "SHA-1" | "SHA-256" | "SHA-512";
  /** Code length: 6, 7 or 8. */
  digits: 6 | 7 | 8;
  /** Type of the account. */
  type: "totp";
  /** Step period in seconds (totp only). */
  period: number;
  /** Optional: pinned/favourite at top. */
  pinned?: boolean;
  /** Optional: notes (private, encrypted). */
  note?: string;
  /** Creation timestamp (ms). */
  createdAt: number;
  /** Last update timestamp (ms). */
  updatedAt: number;
}

/** Decrypted vault payload. */
export interface VaultPayload {
  /** Schema version. */
  v: 1;
  /** Accounts list. */
  accounts: Account[];
  /** User settings (also encrypted at rest). */
  settings: VaultSettings;
}

export interface VaultSettings {
  /** Auto-lock after N seconds of inactivity. 0 = never. */
  autolockSeconds: number;
  /** Lock when the tab is hidden. */
  lockOnHide: boolean;
  /** Auto-clear clipboard after N ms. 0 = never. */
  clipboardClearMs: number;
  /** Reveal codes only on tap (privacy). */
  hideCodes: boolean;
}

export const DEFAULT_SETTINGS: VaultSettings = {
  autolockSeconds: 90,
  lockOnHide: false,
  clipboardClearMs: 20000,
  hideCodes: false,
};

/** Serialised encrypted vault blob (what is stored / exported). */
export interface VaultBlob {
  app: "excalibur";
  version: 1;
  kdf: {
    algo: "PBKDF2";
    hash: "SHA-256";
    iterations: number;
    salt: string; // base64
  };
  cipher: {
    algo: "AES-256-GCM";
    iv: string; // base64
  };
  data: string; // base64 ciphertext
}

/** Result of parsing an otpauth:// URI. */
export interface ParsedOtpauth {
  issuer: string;
  account: string;
  secret: string;
  algorithm: "SHA-1" | "SHA-256" | "SHA-512";
  digits: 6 | 7 | 8;
  period: number;
}

/** Profile list item returned by the server. */
export interface ProfileInfo {
  name: string;
  updatedAt: number;
  createdAt: number;
}

/** Server-side rate-limit / error response. */
export interface ApiError {
  error: string;
  retryAfter?: number;
}
