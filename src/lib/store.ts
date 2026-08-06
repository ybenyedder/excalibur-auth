/**
 * Excalibur — client-side vault store (Zustand).
 *
 * Holds the decrypted vault payload in memory only while unlocked, plus the
 * derived key, auth token, and the current profile/server info. The key and
 * token are purged on lock.
 */

"use client";

import { create } from "zustand";
import type { Account, ProfileInfo, VaultBlob, VaultPayload, VaultSettings } from "./types";
import { DEFAULT_SETTINGS } from "./types";
import {
  PBKDF2_ITERATIONS,
  deriveKeys,
  hashToken,
  loadStored,
  newId,
  newSaltB64,
  openVault,
  sealVault,
  saveStored,
  clearStored,
  saltFromB64,
} from "./vault";
import { DEFAULT_LANG, type Lang } from "./i18n";

export type Screen = "setup" | "lock" | "profiles" | "main";

interface VaultState {
  // Mode & profile
  mode: "local" | "server";
  serverOnline: boolean;
  screen: Screen;
  profile: string | null; // server mode only

  // Crypto state (only while unlocked)
  key: CryptoKey | null;
  authToken: string | null; // hex
  saltB64: string | null;
  iterations: number;
  version: number;
  payload: VaultPayload | null; // decrypted accounts + settings

  // Profiles list (server mode, picker)
  profiles: ProfileInfo[];

  // UI
  busy: boolean;
  error: string | null;
  lang: Lang;
  revealed: Record<string, boolean>; // accountId -> revealed (when hideCodes is on)

  // Actions
  init: () => Promise<void>;
  refreshProfiles: () => Promise<void>;
  createLocal: (passphrase: string) => Promise<void>;
  createServerProfile: (name: string, passphrase: string) => Promise<void>;
  pickProfile: (name: string) => void;
  unlockLocal: (passphrase: string) => Promise<void>;
  unlockServer: (passphrase: string) => Promise<void>;
  lock: () => void;
  save: () => Promise<void>;
  addOrUpdateAccount: (acc: Omit<Account, "id" | "createdAt" | "updatedAt"> & { id?: string }) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  togglePinned: (id: string) => Promise<void>;
  reorderAccounts: (orderedIds: string[]) => Promise<void>;
  updateSettings: (patch: Partial<VaultSettings>) => Promise<void>;
  changePassphrase: (current: string, next: string) => Promise<void>;
  exportVault: () => VaultBlob | null;
  exportVaultAsync: () => Promise<VaultBlob | null>;
  importVault: (blob: VaultBlob, passphrase: string) => Promise<void>;
  wipe: () => Promise<void>;
  setLang: (lang: Lang) => void;
  setRevealed: (id: string, v: boolean) => void;
  setError: (e: string | null) => void;
  setBusy: (b: boolean) => void;
}

const LANG_KEY = "excalibur.lang";

function loadLang(): Lang {
  if (typeof localStorage === "undefined") return DEFAULT_LANG;
  const v = localStorage.getItem(LANG_KEY);
  return v === "fr" ? "fr" : "en";
}

export const useVault = create<VaultState>((set, get) => ({
  mode: "local",
  serverOnline: false,
  screen: "setup",
  profile: null,

  key: null,
  authToken: null,
  saltB64: null,
  iterations: PBKDF2_ITERATIONS,
  version: 0,
  payload: null,

  profiles: [],

  busy: false,
  error: null,
  lang: loadLang(),
  revealed: {},

  async init() {
    // 1. Detect server mode.
    let serverOnline = false;
    try {
      const r = await fetch("/api/ping", { cache: "no-store" });
      if (r.ok) {
        const j = await r.json();
        serverOnline = j?.app === "excalibur" && j?.server === true;
      }
    } catch {
      serverOnline = false;
    }

    if (serverOnline) {
      // 2a. Server mode: fetch profiles list, show picker (or lock if a saved
      // profile name exists).
      let profiles: ProfileInfo[] = [];
      try {
        const r = await fetch("/api/profiles", { cache: "no-store" });
        if (r.ok) profiles = (await r.json()).profiles ?? [];
      } catch {}
      const savedName = typeof localStorage !== "undefined"
        ? localStorage.getItem("excalibur.lastProfile")
        : null;
      const target = savedName && profiles.some((p) => p.name === savedName)
        ? savedName
        : null;
      set({
        mode: "server",
        serverOnline: true,
        profiles,
        screen: target ? "lock" : profiles.length ? "profiles" : "setup",
        profile: target,
      });
    } else {
      // 2b. Local mode: check localStorage for an existing vault.
      const blob = loadStored();
      set({
        mode: "local",
        serverOnline: false,
        screen: blob ? "lock" : "setup",
      });
    }
  },

  async refreshProfiles() {
    if (get().mode !== "server") return;
    try {
      const r = await fetch("/api/profiles", { cache: "no-store" });
      if (r.ok) {
        const profiles = (await r.json()).profiles ?? [];
        set({ profiles });
      }
    } catch {}
  },

  async createLocal(passphrase) {
    set({ busy: true, error: null });
    try {
      const saltB64 = newSaltB64();
      const { key } = await deriveKeys(passphrase, saltFromB64(saltB64), PBKDF2_ITERATIONS);
      const payload: VaultPayload = {
        v: 1,
        accounts: [],
        settings: { ...DEFAULT_SETTINGS },
      };
      const blob = await sealVault(key, saltB64, PBKDF2_ITERATIONS, payload);
      saveStored(blob);
      set({
        mode: "local",
        key,
        authToken: null,
        saltB64,
        iterations: PBKDF2_ITERATIONS,
        version: 1,
        payload,
        screen: "main",
        busy: false,
      });
    } catch (e) {
      set({ busy: false, error: (e as Error).message });
      throw e;
    }
  },

  async createServerProfile(name, passphrase) {
    set({ busy: true, error: null });
    try {
      const saltB64 = newSaltB64();
      const { key, authToken } = await deriveKeys(
        passphrase,
        saltFromB64(saltB64),
        PBKDF2_ITERATIONS
      );
      const tokenHash = await hashToken(authToken);
      const payload: VaultPayload = {
        v: 1,
        accounts: [],
        settings: { ...DEFAULT_SETTINGS },
      };
      const blob = await sealVault(key, saltB64, PBKDF2_ITERATIONS, payload);
      const r = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, tokenHash, vault: blob }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `Error ${r.status}`);
      }
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("excalibur.lastProfile", name);
      }
      set({
        mode: "server",
        profile: name,
        key,
        authToken,
        saltB64,
        iterations: PBKDF2_ITERATIONS,
        version: 1,
        payload,
        screen: "main",
        busy: false,
      });
    } catch (e) {
      set({ busy: false, error: (e as Error).message });
      throw e;
    }
  },

  pickProfile(name) {
    set({ profile: name, screen: "lock", error: null });
  },

  async unlockLocal(passphrase) {
    set({ busy: true, error: null });
    try {
      const blob = loadStored();
      if (!blob) {
        set({ busy: false, screen: "setup" });
        return;
      }
      const saltB64 = blob.kdf.salt;
      const iterations = blob.kdf.iterations;
      const { key } = await deriveKeys(passphrase, saltFromB64(saltB64), iterations);
      let payload: VaultPayload;
      try {
        payload = await openVault(key, blob);
      } catch {
        set({ busy: false, error: "Invalid passphrase." });
        return;
      }
      set({
        key,
        authToken: null,
        saltB64,
        iterations,
        version: 1,
        payload,
        screen: "main",
        busy: false,
      });
    } catch (e) {
      set({ busy: false, error: (e as Error).message });
    }
  },

  async unlockServer(passphrase) {
    const name = get().profile;
    if (!name) return;
    set({ busy: true, error: null });
    try {
      // We don't know the salt/iterations until we ask the server for the blob.
      // But we need the token to fetch it. Chicken-and-egg solved by deriving
      // both from the passphrase *and a salt we'll fetch*.
      // → Two-step: fetch vault blob (requires token). But token depends on salt.
      //
      // Solution: try a probe. We derive keys with a *throwaway* salt just to
      // compute the auth token? No — token depends on the real salt.
      //
      // Real solution: the server's GET /api/vault/:name must accept either:
      //   (a) the bearer token, OR
      //   (b) the passphrase directly (no — never send passphrase).
      //
      // Best practice (and what original Excalibur does): the *profiles list*
      // is public, but the vault blob is *not*. To unlock, we need the salt
      // first. We expose the salt+iterations via a separate *public* endpoint
      // `/api/profiles/:name/kdf` — it's not secret (it's stored in the
      // encrypted blob's envelope anyway, and the server already knows it).
      //
      // For simplicity in this build, we embed salt+iterations in the profiles
      // list response so the client can derive the token without an extra
      // round-trip. The salt is not secret.
      //
      // → fetch profiles to get salt+iterations for this name.
      const r0 = await fetch("/api/profiles", { cache: "no-store" });
      if (!r0.ok) throw new Error("Server unreachable");
      const { profiles } = await r0.json();
      const info = (profiles as (ProfileInfo & { salt?: string; iterations?: number })[])
        .find((p) => p.name === name);
      // If salt isn't on the list, fall back to fetching the vault envelope.
      // We'll attempt a direct GET with a derived-from-empty-salt token first
      // — but that won't match. Instead, we expose kdf publicly:
      let saltB64: string | undefined = info?.salt;
      let iterations = info?.iterations ?? PBKDF2_ITERATIONS;

      if (!saltB64) {
        const kdfR = await fetch(`/api/profiles/${encodeURIComponent(name)}/kdf`, {
          cache: "no-store",
        });
        if (kdfR.ok) {
          const kdf = await kdfR.json();
          saltB64 = kdf.salt;
          iterations = kdf.iterations ?? PBKDF2_ITERATIONS;
        }
      }
      if (!saltB64) throw new Error("Missing KDF parameters");

      const { key, authToken } = await deriveKeys(
        passphrase,
        saltFromB64(saltB64),
        iterations
      );
      const r = await fetch(`/api/vault/${encodeURIComponent(name)}`, {
        headers: { Authorization: `Bearer ${authToken}` },
        cache: "no-store",
      });
      if (r.status === 429) {
        const j = await r.json().catch(() => ({}));
        set({
          busy: false,
          error: j.retryAfter
            ? `Too many attempts. Try again in ${j.retryAfter}s.`
            : "Too many attempts. Try again later.",
        });
        return;
      }
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        set({ busy: false, error: j.error || "Invalid credentials." });
        return;
      }
      const { vault, version } = await r.json();
      if (!vault) {
        set({ busy: false, error: "Vault not found." });
        return;
      }
      let payload: VaultPayload;
      try {
        payload = await openVault(key, vault as VaultBlob);
      } catch {
        set({ busy: false, error: "Invalid passphrase." });
        return;
      }
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("excalibur.lastProfile", name);
      }
      set({
        key,
        authToken,
        saltB64,
        iterations,
        version: version ?? 1,
        payload,
        screen: "main",
        busy: false,
      });
    } catch (e) {
      set({ busy: false, error: (e as Error).message });
    }
  },

  lock() {
    set({
      key: null,
      authToken: null,
      payload: null,
      revealed: {},
      screen: get().profile ? "lock" : get().mode === "local" && loadStored() ? "lock" : "setup",
      error: null,
    });
  },

  async save() {
    const { key, saltB64, iterations, payload, mode, profile, authToken, version } = get();
    if (!key || !payload || !saltB64) return;
    const blob = await sealVault(key, saltB64, iterations, payload);
    if (mode === "local") {
      saveStored(blob);
      set({ version: version + 1 });
    } else if (mode === "server" && profile && authToken) {
      const r = await fetch(`/api/vault/${encodeURIComponent(profile)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ vault: blob, version }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `Save failed (${r.status})`);
      }
      const { version: newVersion } = await r.json();
      set({ version: newVersion ?? version + 1 });
    }
  },

  async addOrUpdateAccount(acc) {
    const { payload } = get();
    if (!payload) return;
    const now = Date.now();
    const accounts = [...payload.accounts];
    if (acc.id) {
      const idx = accounts.findIndex((a) => a.id === acc.id);
      if (idx >= 0) {
        accounts[idx] = {
          ...accounts[idx],
          ...acc,
          id: acc.id,
          updatedAt: now,
        } as Account;
      }
    } else {
      accounts.push({
        ...acc,
        id: newId(),
        createdAt: now,
        updatedAt: now,
      } as Account);
    }
    set({ payload: { ...payload, accounts } });
    await get().save();
  },

  async deleteAccount(id) {
    const { payload } = get();
    if (!payload) return;
    const accounts = payload.accounts.filter((a) => a.id !== id);
    set({ payload: { ...payload, accounts } });
    await get().save();
  },

  async togglePinned(id) {
    const { payload } = get();
    if (!payload) return;
    const accounts = payload.accounts.map((a) =>
      a.id === id ? { ...a, pinned: !a.pinned, updatedAt: Date.now() } : a
    );
    set({ payload: { ...payload, accounts } });
    await get().save();
  },

  async reorderAccounts(orderedIds) {
    const { payload } = get();
    if (!payload) return;
    const byId = new Map(payload.accounts.map((a) => [a.id, a] as const));
    const accounts: Account[] = [];
    for (const id of orderedIds) {
      const a = byId.get(id);
      if (a) accounts.push(a);
    }
    // append any missing (safety)
    for (const a of payload.accounts) {
      if (!accounts.includes(a)) accounts.push(a);
    }
    set({ payload: { ...payload, accounts } });
    await get().save();
  },

  async updateSettings(patch) {
    const { payload } = get();
    if (!payload) return;
    set({ payload: { ...payload, settings: { ...payload.settings, ...patch } } });
    await get().save();
  },

  async changePassphrase(current, next) {
    const { key, saltB64, iterations, payload, mode, profile, authToken } = get();
    if (!key || !payload || !saltB64) return;
    // Verify the current passphrase by re-deriving the auth token and comparing
    // it to the one in state. The auth token is deterministically derived from
    // (passphrase, salt, iterations), so if `current` is correct, the derived
    // token must match `state.authToken`. (CryptoKey objects can't be compared
    // directly, but the hex auth token can.)
    const { key: curKey, authToken: curToken } = await deriveKeys(
      current,
      saltFromB64(saltB64),
      iterations
    );
    if (mode === "server" && authToken && curToken !== authToken) {
      set({ error: "Current passphrase is incorrect." });
      throw new Error("Current passphrase is incorrect.");
    }
    // For local mode there's no authToken in state; verify by opening the
    // actual stored vault blob instead.
    if (mode === "local") {
      const stored = loadStored();
      if (!stored) {
        set({ error: "Vault not found." });
        throw new Error("Vault not found.");
      }
      try {
        await openVault(curKey, stored);
      } catch {
        set({ error: "Current passphrase is incorrect." });
        throw new Error("Current passphrase is incorrect.");
      }
    }

    // Re-seal with a new salt + key + token.
    const newSaltB64 = newSaltB64();
    const { key: newKey, authToken: newToken } = await deriveKeys(
      next,
      saltFromB64(newSaltB64),
      iterations
    );
    const blob = await sealVault(newKey, newSaltB64, iterations, payload);

    if (mode === "local") {
      saveStored(blob);
      set({ key: newKey, saltB64: newSaltB64, authToken: null });
    } else if (mode === "server" && profile) {
      const tokenHash = await hashToken(newToken);
      const r = await fetch(`/api/vault/${encodeURIComponent(profile)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${get().authToken}`,
          "X-New-Token-Hash": tokenHash,
        },
        body: JSON.stringify({ vault: blob, version: get().version, resealed: true }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `Re-seal failed (${r.status})`);
      }
      set({ key: newKey, saltB64: newSaltB64, authToken: newToken });
    }
  },

  exportVault() {
    return null; // use exportVaultAsync
  },

  async exportVaultAsync() {
    const { key, saltB64, iterations, payload } = get();
    if (!key || !payload || !saltB64) return null;
    return sealVault(key, saltB64, iterations, payload);
  },

  async importVault(blob, passphrase) {
    const iterations = blob.kdf.iterations;
    const saltB64 = blob.kdf.salt;
    const { key } = await deriveKeys(passphrase, saltFromB64(saltB64), iterations);
    let payload: VaultPayload;
    try {
      payload = await openVault(key, blob);
    } catch {
      throw new Error("Invalid passphrase for this backup.");
    }
    // Install: re-seal with a fresh salt under the *current* passphrase if
    // already unlocked, or under the backup passphrase for a fresh install.
    const state = get();
    const targetKey = state.key ?? key;
    const targetSalt = state.saltB64 ?? newSaltB64();
    const targetIters = state.iterations ?? PBKDF2_ITERATIONS;
    const newBlob = await sealVault(targetKey, targetSalt, targetIters, payload);

    if (state.mode === "local") {
      saveStored(newBlob);
      set({
        key: targetKey,
        saltB64: targetSalt,
        iterations: targetIters,
        payload,
        version: state.version + 1,
        screen: "main",
      });
    } else if (state.mode === "server" && state.profile) {
      // Re-seal under current key and PUT.
      const r = await fetch(`/api/vault/${encodeURIComponent(state.profile)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${state.authToken}`,
        },
        body: JSON.stringify({ vault: newBlob, version: state.version }),
      });
      if (!r.ok) throw new Error("Import failed");
      const { version } = await r.json();
      set({ payload, version: version ?? state.version + 1, screen: "main" });
    } else {
      // Fresh local install with the backup's passphrase.
      saveStored(newBlob);
      set({
        mode: "local",
        key,
        saltB64,
        iterations,
        payload,
        version: 1,
        screen: "main",
      });
    }
  },

  async wipe() {
    const { mode, profile, authToken } = get();
    if (mode === "server" && profile && authToken) {
      try {
        await fetch(`/api/vault/${encodeURIComponent(profile)}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${authToken}` },
        });
      } catch {}
    }
    clearStored();
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("excalibur.lastProfile");
    }
    set({
      key: null,
      authToken: null,
      saltB64: null,
      payload: null,
      profile: null,
      version: 0,
      screen: "setup",
      revealed: {},
    });
  },

  setLang(lang) {
    if (typeof localStorage !== "undefined") localStorage.setItem(LANG_KEY, lang);
    set({ lang });
  },

  setRevealed(id, v) {
    set((s) => ({ revealed: { ...s.revealed, [id]: v } }));
  },

  setError(e) {
    set({ error: e });
  },
  setBusy(b) {
    set({ busy: b });
  },
}));
