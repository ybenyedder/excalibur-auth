"use client";

import * as React from "react";
import { useVault } from "@/lib/store";
import { Logo } from "./logo";
import { Lock, AlertCircle, ArrowLeft } from "lucide-react";

/**
 * Lock screen — ask for the passphrase to decrypt the vault.
 * Works for both local mode (localStorage) and server mode (named profile).
 */
export function LockScreen() {
  const mode = useVault((s) => s.mode);
  const profile = useVault((s) => s.profile);
  const unlockLocal = useVault((s) => s.unlockLocal);
  const unlockServer = useVault((s) => s.unlockServer);
  const busy = useVault((s) => s.busy);
  const error = useVault((s) => s.error);
  const lang = useVault((s) => s.lang);
  const pickProfile = useVault((s) => s.pickProfile);
  const profiles = useVault((s) => s.profiles);

  const [pass, setPass] = React.useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "server" && profile) {
      await unlockServer(pass);
    } else {
      await unlockLocal(pass);
    }
    setPass("");
  };

  return (
    <div className="ga-fade flex min-h-dvh flex-col items-center justify-center px-5 py-10 text-center">
      <div className="text-primary">
        <Logo size={72} />
      </div>
      <h1 className="mt-6 text-3xl font-medium tracking-tight">
        {lang === "fr" ? "Excalibur" : "Excalibur"}
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {lang === "fr" ? "Coffre verrouillé" : "Vault locked"}
      </p>
      {mode === "server" && profile && (
        <p className="mt-2 font-mono text-sm font-medium text-primary">{profile}</p>
      )}

      <form
        onSubmit={submit}
        className="mt-10 flex w-full max-w-sm flex-col gap-3 text-left"
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            {lang === "fr" ? "Phrase de passe" : "Passphrase"}
          </span>
          <input
            type="password"
            className="ga-field font-mono"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            autoComplete="current-password"
            required
            autoFocus
          />
        </label>

        {error && (
          <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className="ga-btn-primary mt-2 w-full">
          {busy ? "…" : lang === "fr" ? "Déverrouiller" : "Unlock"}
        </button>
      </form>

      {mode === "server" && profiles.length > 1 && (
        <button
          type="button"
          onClick={() => pickProfile("")}
          className="ga-btn-text mt-5"
        >
          <ArrowLeft className="h-4 w-4" />
          {lang === "fr" ? "Changer de profil" : "Switch profile"}
        </button>
      )}

      <p className="mt-6 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Lock className="h-3 w-3" />
        {lang === "fr" ? "Échap verrouille · 5 essais puis gel 5 min" : "Esc locks · 5 tries then 5-min freeze"}
      </p>
    </div>
  );
}
