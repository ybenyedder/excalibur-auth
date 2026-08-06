"use client";

import * as React from "react";
import { useVault } from "@/lib/store";
import { Logo } from "./logo";
import { ShieldCheck, Lock } from "lucide-react";

/**
 * First-run setup screen: create the vault (local) or a new server profile.
 */
export function SetupScreen() {
  const mode = useVault((s) => s.mode);
  const createLocal = useVault((s) => s.createLocal);
  const createServerProfile = useVault((s) => s.createServerProfile);
  const refreshProfiles = useVault((s) => s.refreshProfiles);
  const busy = useVault((s) => s.busy);
  const error = useVault((s) => s.error);
  const setError = useVault((s) => s.setError);
  const lang = useVault((s) => s.lang);

  const [name, setName] = React.useState("");
  const [pass, setPass] = React.useState("");
  const [pass2, setPass2] = React.useState("");
  const [localErr, setLocalErr] = React.useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalErr(null);
    setError(null);
    if (pass.length < 8) {
      setLocalErr(lang === "fr" ? "La phrase doit faire au moins 8 caractères." : "Passphrase must be at least 8 characters.");
      return;
    }
    if (pass !== pass2) {
      setLocalErr(lang === "fr" ? "Les phrases ne correspondent pas." : "Passphrases do not match.");
      return;
    }
    try {
      if (mode === "server") {
        await createServerProfile(name.trim(), pass);
        await refreshProfiles();
      } else {
        await createLocal(pass);
      }
    } catch {
      /* error surfaced via store */
    }
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
        {lang === "fr" ? "Codes de vérification" : "Verification codes"}
      </p>

      <form
        onSubmit={submit}
        className="mt-10 flex w-full max-w-sm flex-col gap-3 text-left"
      >
        <div className="ga-card flex items-start gap-3 p-4 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
          <span>
            {lang === "fr"
              ? "Choisissez une phrase de passe maîtresse. Elle chiffre votre coffre sur cet appareil (AES-256-GCM) et n'est stockée nulle part — si vous la perdez, le coffre est irrécupérable."
              : "Choose a master passphrase. It encrypts your vault on this device (AES-256-GCM) and is never stored anywhere — if you lose it, the vault is unrecoverable."}
          </span>
        </div>

        {mode === "server" && (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {lang === "fr" ? "Nom du profil" : "Profile name"}
            </span>
            <input
              className="ga-field font-mono"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="alice"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={32}
              pattern="[a-z0-9][a-z0-9_-]{0,31}"
              required
            />
            <span className="text-[11px] text-muted-foreground">
              {lang === "fr"
                ? "Minuscules, chiffres, tirets — visible par les autres du serveur."
                : "Lowercase, digits, dashes — visible to others on this server."}
            </span>
          </label>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            {lang === "fr" ? "Phrase de passe" : "Passphrase"}
          </span>
          <input
            type="password"
            className="ga-field font-mono"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
            autoFocus
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            {lang === "fr" ? "Confirmez" : "Confirm passphrase"}
          </span>
          <input
            type="password"
            className="ga-field font-mono"
            value={pass2}
            onChange={(e) => setPass2(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>

        {(localErr || error) && (
          <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
            <Lock className="h-4 w-4" />
            {localErr || error}
          </p>
        )}

        <button type="submit" disabled={busy} className="ga-btn-primary mt-2 w-full">
          {busy
            ? "…"
            : mode === "server"
            ? lang === "fr" ? "Créer le profil" : "Create profile"
            : lang === "fr" ? "Créer le coffre" : "Create vault"}
        </button>
      </form>

      <p className="mt-6 max-w-sm text-[11px] leading-relaxed text-muted-foreground">
        {lang === "fr"
          ? "Zéro connaissance : le serveur ne reçoit que des données chiffrées et un hachage de jeton. Même avec une copie complète de la base, un attaquant n'obtient que des coffres illisibles."
          : "Zero-knowledge: the server only ever receives encrypted data and a token hash. Even with a full copy of the database, an attacker only gets unreadable vaults."}
      </p>
    </div>
  );
}
