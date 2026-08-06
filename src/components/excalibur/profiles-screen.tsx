"use client";

import * as React from "react";
import { useVault } from "@/lib/store";
import { Logo } from "./logo";
import { Plus, Clock } from "lucide-react";

function timeAgo(ts: number, lang: "en" | "fr"): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return lang === "fr" ? "à l'instant" : "just now";
  if (m < 60) return lang === "fr" ? `il y a ${m} min` : `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return lang === "fr" ? `il y a ${h} h` : `${h}h ago`;
  const d = Math.floor(h / 24);
  return lang === "fr" ? `il y a ${d} j` : `${d}d ago`;
}

/**
 * Server mode only: pick which profile to unlock.
 */
export function ProfilesScreen() {
  const profiles = useVault((s) => s.profiles);
  const pickProfile = useVault((s) => s.pickProfile);
  const lang = useVault((s) => s.lang);

  // "New profile" just routes to the setup screen (server mode stays).
  const goSetup = () => useVault.setState({ screen: "setup" });

  return (
    <div className="ga-fade flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <div className="text-primary">
        <Logo size={56} />
      </div>
      <h1 className="mt-4 text-xl font-medium tracking-tight">
        {lang === "fr" ? "Qui êtes-vous ?" : "Who are you?"}
      </h1>

      <div className="mt-6 flex w-full max-w-sm flex-col gap-2">
        {profiles.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            {lang === "fr" ? "Aucun profil sur ce serveur pour l'instant." : "No profiles on this server yet."}
          </p>
        )}
        {profiles.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => pickProfile(p.name)}
            className="ga-card ga-card-hover ga-card-pressable flex items-center justify-between gap-3 px-4 py-3.5 text-left"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-sm font-medium text-primary"
                aria-hidden="true"
              >
                {p.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <div className="truncate font-mono text-[15px] font-medium">{p.name}</div>
                <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {lang === "fr" ? "Dernière utilisation" : "Last used"} {timeAgo(p.updatedAt, lang)}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <button type="button" onClick={goSetup} className="ga-btn-primary mt-6">
        <Plus className="h-4 w-4" />
        {lang === "fr" ? "Nouveau profil" : "New profile"}
      </button>
    </div>
  );
}
