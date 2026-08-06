"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useVault } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { parseOtpauth, normalizeSecret, formatOtpauth } from "@/lib/totp";
import type { Account, ParsedOtpauth } from "@/lib/types";
import { QrCode, Link2, Keyboard, AlertCircle, Copy } from "lucide-react";
import { QrScannerDialog } from "./qr-scanner-dialog";

/**
 * Add / edit account dialog. Three entry modes:
 *  - otpauth:// link (paste)
 *  - manual entry (issuer / account / secret + advanced opts)
 *  - QR scan (camera)
 */
export function AddAccountDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Account | null;
}) {
  const { toast } = useToast();
  const lang = useVault((s) => s.lang);
  const addOrUpdate = useVault((s) => s.addOrUpdateAccount);

  const [tab, setTab] = React.useState<"uri" | "manual" | "qr">("uri");
  const [uri, setUri] = React.useState("");
  const [issuer, setIssuer] = React.useState("");
  const [account, setAccount] = React.useState("");
  const [secret, setSecret] = React.useState("");
  const [algorithm, setAlgorithm] = React.useState<"SHA-1" | "SHA-256" | "SHA-512">("SHA-1");
  const [digits, setDigits] = React.useState<6 | 7 | 8>(6);
  const [period, setPeriod] = React.useState(30);
  const [err, setErr] = React.useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = React.useState(false);

  // Hydrate fields when editing.
  React.useEffect(() => {
    if (open) {
      setErr(null);
      if (editing) {
        setIssuer(editing.issuer);
        setAccount(editing.account);
        setSecret(editing.secret);
        setAlgorithm(editing.algorithm);
        setDigits(editing.digits);
        setPeriod(editing.period);
        setUri(formatOtpauth(editing));
        setTab("manual");
      } else {
        setIssuer("");
        setAccount("");
        setSecret("");
        setAlgorithm("SHA-1");
        setDigits(6);
        setPeriod(30);
        setUri("");
        setTab("uri");
      }
    }
  }, [open, editing]);

  const buildFromUri = (): ParsedOtpauth | null => {
    try {
      return parseOtpauth(uri);
    } catch (e) {
      setErr((e as Error).message);
      return null;
    }
  };

  const buildFromManual = (): ParsedOtpauth | null => {
    try {
      const s = normalizeSecret(secret);
      if (!s) {
        setErr(lang === "fr" ? "Secret Base32 invalide" : "Invalid Base32 secret");
        return null;
      }
      return {
        issuer: issuer.trim(),
        account: account.trim() || "?",
        secret: s,
        algorithm,
        digits,
        period,
      };
    } catch (e) {
      setErr((e as Error).message);
      return null;
    }
  };

  const save = async () => {
    setErr(null);
    if (tab === "uri") {
      // Support bulk import: one otpauth per line.
      const lines = uri
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length === 0) {
        setErr(lang === "fr" ? "Lien invalide" : "Invalid link");
        return;
      }
      if (lines.length > 1) {
        let ok = 0;
        let fail = 0;
        for (const line of lines) {
          try {
            const parsed = parseOtpauth(line);
            await addOrUpdate({
              issuer: parsed.issuer,
              account: parsed.account,
              secret: parsed.secret,
              algorithm: parsed.algorithm,
              digits: parsed.digits,
              period: parsed.period,
              type: "totp",
            });
            ok++;
          } catch {
            fail++;
          }
        }
        toast({
          title: lang === "fr" ? "Import groupé" : "Bulk import",
          description:
            lang === "fr"
              ? `${ok} ajouté(s)${fail ? `, ${fail} échoué(s)` : ""}`
              : `${ok} added${fail ? `, ${fail} failed` : ""}`,
        });
        onOpenChange(false);
        return;
      }
    }
    const parsed = tab === "uri" ? buildFromUri() : buildFromManual();
    if (!parsed) return;
    await addOrUpdate({
      id: editing?.id,
      issuer: parsed.issuer,
      account: parsed.account,
      secret: parsed.secret,
      algorithm: parsed.algorithm,
      digits: parsed.digits,
      period: parsed.period,
      type: "totp",
      pinned: editing?.pinned,
      note: editing?.note,
    });
    toast({ title: lang === "fr" ? "Compte enregistré" : "Account saved" });
    onOpenChange(false);
  };

  const copyLink = () => {
    const parsed = tab === "uri" ? buildFromUri() : buildFromManual();
    if (!parsed) return;
    const link = formatOtpauth(parsed);
    navigator.clipboard.writeText(link);
    toast({ title: lang === "fr" ? "Lien copié" : "Link copied" });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md gap-0 p-0">
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle className="text-lg font-medium">
              {editing
                ? lang === "fr" ? "Modifier le compte" : "Edit account"
                : lang === "fr" ? "Ajouter un compte" : "Add account"}
            </DialogTitle>
          </DialogHeader>

          {!editing && (
            <div className="px-5">
              <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="uri" className="text-xs">
                    <Link2 className="mr-1.5 h-3.5 w-3.5" />
                    {lang === "fr" ? "Lien" : "Link"}
                  </TabsTrigger>
                  <TabsTrigger value="manual" className="text-xs">
                    <Keyboard className="mr-1.5 h-3.5 w-3.5" />
                    {lang === "fr" ? "Manuel" : "Manual"}
                  </TabsTrigger>
                  <TabsTrigger value="qr" className="text-xs">
                    <QrCode className="mr-1.5 h-3.5 w-3.5" />
                    {lang === "fr" ? "QR" : "Scan"}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="uri" className="mt-4">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      otpauth://
                    </span>
                    <textarea
                      className="ga-field min-h-[88px] resize-y font-mono text-sm"
                      value={uri}
                      onChange={(e) => setUri(e.target.value)}
                      placeholder="otpauth://totp/Service:account?secret=…"
                      spellCheck={false}
                      autoCapitalize="none"
                    />
                  </label>
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                    {lang === "fr"
                      ? "Sur le site du service, choisissez « impossible de scanner le QR code » pour obtenir ce lien — ou scannez-le directement. Astuce : collez plusieurs liens (un par ligne) pour un import groupé."
                      : "On the service's site, choose “can't scan the QR code” to get this link — or scan it directly. Tip: paste multiple links (one per line) for bulk import."}
                  </p>
                </TabsContent>

                <TabsContent value="manual" className="mt-4">
                  <div className="flex flex-col gap-3">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        {lang === "fr" ? "Service (émetteur)" : "Service (issuer)"}
                      </span>
                      <input
                        className="ga-field"
                        value={issuer}
                        onChange={(e) => setIssuer(e.target.value)}
                        placeholder="GitHub"
                        autoCapitalize="words"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        {lang === "fr" ? "Compte" : "Account"}
                      </span>
                      <input
                        className="ga-field"
                        value={account}
                        onChange={(e) => setAccount(e.target.value)}
                        placeholder="you@example.com"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        {lang === "fr" ? "Secret (Base32)" : "Secret (Base32)"}
                      </span>
                      <input
                        className="ga-field font-mono"
                        value={secret}
                        onChange={(e) => setSecret(e.target.value)}
                        placeholder="JBSW Y3DP EHPK 3PXP"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                      />
                    </label>
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs font-medium text-primary">
                        {lang === "fr" ? "Options avancées" : "Advanced options"}
                      </summary>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <label className="flex flex-col gap-1">
                          <span className="text-[11px] text-muted-foreground">
                            {lang === "fr" ? "Algorithme" : "Algorithm"}
                          </span>
                          <select
                            className="ga-field py-2 text-sm"
                            value={algorithm}
                            onChange={(e) => setAlgorithm(e.target.value as typeof algorithm)}
                          >
                            <option value="SHA-1">SHA-1</option>
                            <option value="SHA-256">SHA-256</option>
                            <option value="SHA-512">SHA-512</option>
                          </select>
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-[11px] text-muted-foreground">
                            {lang === "fr" ? "Chiffres" : "Digits"}
                          </span>
                          <select
                            className="ga-field py-2 text-sm"
                            value={String(digits)}
                            onChange={(e) => setDigits(Number(e.target.value) as 6 | 7 | 8)}
                          >
                            <option value="6">6</option>
                            <option value="7">7</option>
                            <option value="8">8</option>
                          </select>
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-[11px] text-muted-foreground">
                            {lang === "fr" ? "Période (s)" : "Period (s)"}
                          </span>
                          <input
                            type="number"
                            min={5}
                            max={300}
                            className="ga-field py-2 text-sm"
                            value={period}
                            onChange={(e) => setPeriod(Number(e.target.value))}
                          />
                        </label>
                      </div>
                    </details>
                  </div>
                </TabsContent>

                <TabsContent value="qr" className="mt-4">
                  <div className="flex flex-col items-center gap-3 py-2 text-center">
                    <QrCode className="h-12 w-12 text-primary" />
                    <p className="text-sm text-muted-foreground">
                      {lang === "fr"
                        ? "Pointez votre caméra vers le QR code otpauth."
                        : "Point your camera at the otpauth QR code."}
                    </p>
                    <button
                      type="button"
                      onClick={() => setScannerOpen(true)}
                      className="ga-btn-primary"
                    >
                      {lang === "fr" ? "Démarrer le scan" : "Start scanning"}
                    </button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {editing && (
            <div className="px-5 pb-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  {lang === "fr" ? "Service (émetteur)" : "Service (issuer)"}
                </span>
                <input
                  className="ga-field"
                  value={issuer}
                  onChange={(e) => setIssuer(e.target.value)}
                  placeholder="GitHub"
                />
              </label>
              <label className="mt-3 flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  {lang === "fr" ? "Compte" : "Account"}
                </span>
                <input
                  className="ga-field"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  placeholder="you@example.com"
                />
              </label>
              <label className="mt-3 flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  {lang === "fr" ? "Secret (Base32)" : "Secret (Base32)"}
                </span>
                <input
                  className="ga-field font-mono"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="JBSW Y3DP EHPK 3PXP"
                />
              </label>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground">Algorithm</span>
                  <select
                    className="ga-field py-2 text-sm"
                    value={algorithm}
                    onChange={(e) => setAlgorithm(e.target.value as typeof algorithm)}
                  >
                    <option value="SHA-1">SHA-1</option>
                    <option value="SHA-256">SHA-256</option>
                    <option value="SHA-512">SHA-512</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground">Digits</span>
                  <select
                    className="ga-field py-2 text-sm"
                    value={String(digits)}
                    onChange={(e) => setDigits(Number(e.target.value) as 6 | 7 | 8)}
                  >
                    <option value="6">6</option>
                    <option value="7">7</option>
                    <option value="8">8</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground">Period</span>
                  <input
                    type="number"
                    min={5}
                    max={300}
                    className="ga-field py-2 text-sm"
                    value={period}
                    onChange={(e) => setPeriod(Number(e.target.value))}
                  />
                </label>
              </div>
            </div>
          )}

          {err && (
            <p role="alert" className="mx-5 mt-3 flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {err}
            </p>
          )}

          <DialogFooter className="flex-row items-center gap-2 px-5 pb-5 pt-4">
            {!editing && tab !== "qr" && (
              <button type="button" onClick={copyLink} className="ga-btn-text">
                <Copy className="h-4 w-4" />
                {lang === "fr" ? "Copier le lien" : "Copy link"}
              </button>
            )}
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="ga-btn-text"
            >
              {lang === "fr" ? "Annuler" : "Cancel"}
            </button>
            {tab !== "qr" && (
              <button type="button" onClick={save} className="ga-btn-primary">
                {lang === "fr" ? "Enregistrer" : "Save"}
              </button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <QrScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScanned={(text) => {
          setUri(text);
          setTab("uri");
          setScannerOpen(false);
        }}
      />
    </>
  );
}
