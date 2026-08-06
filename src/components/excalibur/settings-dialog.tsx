"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVault } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "./confirm-provider";
import { useTheme } from "next-themes";
import type { VaultBlob } from "@/lib/types";
import { isVaultShape } from "@/lib/vault";
import {
  X,
  Lock,
  ShieldCheck,
  Download,
  Upload,
  KeyRound,
  Trash2,
  Sun,
  Moon,
  Monitor,
  Languages,
  Eye,
  Clock,
  BarChart3,
  AlertTriangle,
} from "lucide-react";

function SectionTitle({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      {children}
    </h3>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast();
  const { confirm, prompt } = useConfirm();
  const lang = useVault((s) => s.lang);
  const setLang = useVault((s) => s.setLang);
  const payload = useVault((s) => s.payload);
  const settings = payload?.settings;

  // Auto-close the settings dialog if the vault locks while it's open
  // (e.g. auto-lock fires during a long editing session).
  React.useEffect(() => {
    if (open && !payload) {
      onOpenChange(false);
    }
  }, [open, payload, onOpenChange]);
  const updateSettings = useVault((s) => s.updateSettings);
  const changePassphrase = useVault((s) => s.changePassphrase);
  const exportVaultAsync = useVault((s) => s.exportVaultAsync);
  const importVault = useVault((s) => s.importVault);
  const wipe = useVault((s) => s.wipe);
  const mode = useVault((s) => s.mode);
  const profile = useVault((s) => s.profile);
  const { theme, setTheme } = useTheme();
  const fileRef = React.useRef<HTMLInputElement>(null);

  const [pcCur, setPcCur] = React.useState("");
  const [pcNew, setPcNew] = React.useState("");
  const [pcNew2, setPcNew2] = React.useState("");
  const [pcErr, setPcErr] = React.useState<string | null>(null);
  const [pcBusy, setPcBusy] = React.useState(false);
  const [wipeText, setWipeText] = React.useState("");

  const accounts = payload?.accounts ?? [];

  const onExport = async () => {
    const blob = await exportVaultAsync();
    if (!blob) return;
    const data = JSON.stringify(blob, null, 2);
    const file = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = `excalibur-${profile || "vault"}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: lang === "fr" ? "Coffre exporté" : "Vault exported" });
  };

  const onImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const obj = JSON.parse(text);
      if (!isVaultShape(obj)) {
        toast({ title: lang === "fr" ? "Fichier invalide" : "Invalid file", variant: "destructive" });
        return;
      }
      const pass = await prompt({
        title: lang === "fr" ? "Importer la sauvegarde" : "Install backup",
        description: lang === "fr"
          ? "Saisissez la phrase de passe de cette sauvegarde pour l'installer."
          : "Enter the passphrase of this backup to install it.",
        placeholder: lang === "fr" ? "Phrase de passe" : "Passphrase",
        type: "password",
        confirmLabel: lang === "fr" ? "Installer" : "Install",
        cancelLabel: lang === "fr" ? "Annuler" : "Cancel",
        minLength: 8,
      });
      if (!pass) return;
      await importVault(obj as VaultBlob, pass);
      toast({ title: lang === "fr" ? "Coffre importé" : "Vault imported" });
      onOpenChange(false);
    } catch (e) {
      toast({ title: (e as Error).message, variant: "destructive" });
    }
  };

  const onPassChange = async () => {
    setPcErr(null);
    if (pcNew.length < 8) {
      setPcErr(lang === "fr" ? "La phrase doit faire au moins 8 caractères." : "Passphrase must be at least 8 characters.");
      return;
    }
    if (pcNew !== pcNew2) {
      setPcErr(lang === "fr" ? "Les phrases ne correspondent pas." : "Passphrases do not match.");
      return;
    }
    setPcBusy(true);
    try {
      await changePassphrase(pcCur, pcNew);
      toast({ title: lang === "fr" ? "Phrase de passe changée" : "Passphrase changed" });
      setPcCur("");
      setPcNew("");
      setPcNew2("");
    } catch (e) {
      setPcErr((e as Error).message);
    } finally {
      setPcBusy(false);
    }
  };

  const onWipe = async () => {
    const confirmWord = lang === "fr" ? "EFFACER" : "DELETE";
    if (wipeText !== confirmWord) return;
    const ok = await confirm({
      title: lang === "fr" ? "Détruire définitivement le coffre ?" : "Permanently destroy the vault?",
      description: lang === "fr"
        ? "Tous les comptes chiffrés seront effacés du serveur. Cette action est irréversible."
        : "All encrypted accounts will be erased from the server. This action is irreversible.",
      confirmLabel: lang === "fr" ? "Tout effacer" : "Erase everything",
      cancelLabel: lang === "fr" ? "Annuler" : "Cancel",
      variant: "destructive",
    });
    if (!ok) return;
    await wipe();
    setWipeText("");
    onOpenChange(false);
    toast({ title: lang === "fr" ? "Coffre effacé" : "Vault erased" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88dvh] max-w-md gap-0 overflow-y-auto p-0 ga-scroll">
        <DialogHeader className="sticky top-0 z-10 flex-row items-center justify-between border-b border-border bg-card/95 px-5 py-4 backdrop-blur">
          <DialogTitle className="text-lg font-medium">
            {lang === "fr" ? "Réglages" : "Settings"}
          </DialogTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="ga-icon-btn"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        <div className="flex flex-col gap-5 px-5 py-5">
          {/* Stats */}
          <section className="flex flex-col gap-2">
            <SectionTitle icon={BarChart3}>
              {lang === "fr" ? "Statistiques" : "Statistics"}
            </SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              <div className="ga-card p-3">
                <div className="text-2xl font-semibold tnum">{accounts.length}</div>
                <div className="text-[11px] text-muted-foreground">
                  {lang === "fr" ? "comptes" : "accounts"}
                </div>
              </div>
              <div className="ga-card p-3">
                <div className="text-2xl font-semibold tnum">
                  {accounts.filter((a) => a.pinned).length}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {lang === "fr" ? "épinglés" : "pinned"}
                </div>
              </div>
            </div>
          </section>

          {/* Appearance */}
          <section className="flex flex-col gap-1">
            <SectionTitle icon={Sun}>
              {lang === "fr" ? "Apparence" : "Appearance"}
            </SectionTitle>
            <Row
              label={lang === "fr" ? "Thème" : "Theme"}
              hint={lang === "fr" ? "Clair / sombre / système" : "Light / dark / system"}
            >
              <div className="flex gap-1 rounded-full bg-muted p-1">
                {[
                  { v: "light", icon: Sun, label: lang === "fr" ? "Clair" : "Light" },
                  { v: "dark", icon: Moon, label: lang === "fr" ? "Sombre" : "Dark" },
                  { v: "system", icon: Monitor, label: lang === "fr" ? "Auto" : "Auto" },
                ].map(({ v, icon: Icon, label }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setTheme(v)}
                    title={label}
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                      theme === v ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </Row>
            <Row
              label={lang === "fr" ? "Langue" : "Language"}
              hint="EN / FR"
            >
              <div className="flex gap-1 rounded-full bg-muted p-1">
                {(["en", "fr"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLang(l)}
                    className={`flex h-8 items-center justify-center rounded-full px-3 text-xs font-medium transition-colors ${
                      lang === l ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </Row>
          </section>

          {/* Lock */}
          <section className="flex flex-col gap-1">
            <SectionTitle icon={Lock}>
              {lang === "fr" ? "Verrouillage" : "Auto-lock"}
            </SectionTitle>
            <Row
              label={lang === "fr" ? "Après inactivité" : "After inactivity"}
            >
              <Select
                value={String(settings?.autolockSeconds ?? 90)}
                onValueChange={(v) => updateSettings({ autolockSeconds: Number(v) })}
              >
                <SelectTrigger className="h-9 w-36 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">{lang === "fr" ? "Jamais" : "Never"}</SelectItem>
                  <SelectItem value="30">30{s(lang)}</SelectItem>
                  <SelectItem value="60">1 min</SelectItem>
                  <SelectItem value="90">1 min 30</SelectItem>
                  <SelectItem value="180">3 min</SelectItem>
                  <SelectItem value="300">5 min</SelectItem>
                </SelectContent>
              </Select>
            </Row>
            <Row
              label={lang === "fr" ? "Onglet masqué" : "When tab hidden"}
              hint={lang === "fr" ? "Verrouiller au masquage" : "Lock on hide"}
            >
              <Switch
                checked={!!settings?.lockOnHide}
                onCheckedChange={(v) => updateSettings({ lockOnHide: v })}
              />
            </Row>
          </section>

          {/* Privacy */}
          <section className="flex flex-col gap-1">
            <SectionTitle icon={Eye}>
              {lang === "fr" ? "Confidentialité" : "Privacy"}
            </SectionTitle>
            <Row
              label={lang === "fr" ? "Masquer les codes" : "Hide codes"}
              hint={lang === "fr" ? "Jusqu'au tap" : "Until tapped"}
            >
              <Switch
                checked={!!settings?.hideCodes}
                onCheckedChange={(v) => updateSettings({ hideCodes: v })}
              />
            </Row>
            <Row
              label={lang === "fr" ? "Auto-effacer presse-papiers" : "Auto-clear clipboard"}
            >
              <Select
                value={String(settings?.clipboardClearMs ?? 20000)}
                onValueChange={(v) => updateSettings({ clipboardClearMs: Number(v) })}
              >
                <SelectTrigger className="h-9 w-36 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">{lang === "fr" ? "Jamais" : "Never"}</SelectItem>
                  <SelectItem value="10000">10{s(lang)}</SelectItem>
                  <SelectItem value="20000">20{s(lang)}</SelectItem>
                  <SelectItem value="30000">30{s(lang)}</SelectItem>
                  <SelectItem value="60000">1 min</SelectItem>
                </SelectContent>
              </Select>
            </Row>
          </section>

          {/* Backup */}
          <section className="flex flex-col gap-2">
            <SectionTitle icon={ShieldCheck}>
              {lang === "fr" ? "Sauvegarde" : "Backup"}
            </SectionTitle>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {lang === "fr"
                ? "La sauvegarde est le coffre chiffré tel quel — illisible sans la phrase de passe."
                : "The backup is the encrypted vault as-is — unreadable without the passphrase."}
            </p>
            <div className="flex gap-2">
              <button onClick={onExport} className="ga-btn-outline flex-1">
                <Download className="h-4 w-4" />
                {lang === "fr" ? "Exporter" : "Export"}
              </button>
              <button onClick={() => fileRef.current?.click()} className="ga-btn-outline flex-1">
                <Upload className="h-4 w-4" />
                {lang === "fr" ? "Importer" : "Import"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onImportFile(f);
                  e.target.value = "";
                }}
              />
            </div>
          </section>

          {/* Passphrase */}
          <section className="flex flex-col gap-2">
            <SectionTitle icon={KeyRound}>
              {lang === "fr" ? "Phrase de passe" : "Change passphrase"}
            </SectionTitle>
            <input
              type="password"
              className="ga-field font-mono"
              placeholder={lang === "fr" ? "Phrase actuelle" : "Current passphrase"}
              value={pcCur}
              onChange={(e) => setPcCur(e.target.value)}
              autoComplete="current-password"
            />
            <input
              type="password"
              className="ga-field font-mono"
              placeholder={lang === "fr" ? "Nouvelle phrase" : "New passphrase"}
              value={pcNew}
              onChange={(e) => setPcNew(e.target.value)}
              autoComplete="new-password"
              minLength={8}
            />
            <input
              type="password"
              className="ga-field font-mono"
              placeholder={lang === "fr" ? "Confirmez" : "Confirm"}
              value={pcNew2}
              onChange={(e) => setPcNew2(e.target.value)}
              autoComplete="new-password"
              minLength={8}
            />
            {pcErr && (
              <p className="text-sm text-destructive">{pcErr}</p>
            )}
            <button
              type="button"
              onClick={onPassChange}
              disabled={pcBusy}
              className="ga-btn-tonal self-start"
            >
              {pcBusy ? "…" : lang === "fr" ? "Changer la phrase" : "Change passphrase"}
            </button>
          </section>

          {/* Danger */}
          <section className="flex flex-col gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
            <SectionTitle icon={AlertTriangle}>
              {lang === "fr" ? "Zone dangereuse" : "Danger zone"}
            </SectionTitle>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {lang === "fr"
                ? "Tapez EFFACER puis confirmez pour détruire le coffre de cet appareil."
                : "Type DELETE then confirm to destroy the vault on this device."}
            </p>
            <div className="flex gap-2">
              <input
                className="ga-field font-mono"
                placeholder={lang === "fr" ? "EFFACER" : "DELETE"}
                value={wipeText}
                onChange={(e) => setWipeText(e.target.value)}
                autoCapitalize="characters"
              />
              <button
                type="button"
                onClick={onWipe}
                disabled={wipeText !== (lang === "fr" ? "EFFACER" : "DELETE")}
                className="shrink-0 rounded-full bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-opacity disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </section>

          {mode === "server" && profile && (
            <p className="text-center text-[11px] text-muted-foreground">
              {lang === "fr" ? "Profil" : "Profile"}: <span className="font-mono">{profile}</span>
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function s(lang: "en" | "fr") {
  return lang === "fr" ? " s" : "s";
}
