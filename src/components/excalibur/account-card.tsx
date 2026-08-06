"use client";

import * as React from "react";
import { MoreVertical, Pin, Copy, Eye, EyeOff, QrCode, Pencil, Trash2 } from "lucide-react";
import type { Account } from "@/lib/types";
import { b32decode, totp, splitCode, secondsRemaining } from "@/lib/totp";
import { useVault } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "./confirm-provider";
import { IssuerAvatar } from "./issuer-avatar";
import { CountdownRing } from "./countdown-ring";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * A single account card — Google Authenticator style.
 * Big code on the left, circular countdown on the right, tap to copy.
 */
export function AccountCard({
  account,
  onEdit,
  onShowQr,
}: {
  account: Account;
  onEdit: (a: Account) => void;
  onShowQr: (a: Account) => void;
}) {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const settings = useVault((s) => s.payload?.settings);
  const hideCodes = settings?.hideCodes;
  const revealed = useVault((s) => s.revealed[account.id]);
  const setRevealed = useVault((s) => s.setRevealed);
  const deleteAccount = useVault((s) => s.deleteAccount);
  const togglePinned = useVault((s) => s.togglePinned);
  const lang = useVault((s) => s.lang);

  const [code, setCode] = React.useState("");
  const [fresh, setFresh] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [tick, setTick] = React.useState(0);

  // Generate / refresh the code each second (and animate when it changes).
  React.useEffect(() => {
    let raf = 0;
    let lastCounter = -1;
    let lastCode = "";
    const loop = async () => {
      const now = Date.now();
      const counter = Math.floor(now / 1000 / account.period);
      if (counter !== lastCounter) {
        lastCounter = counter;
        try {
          const bytes = b32decode(account.secret);
          const c = await totp(bytes, {
            algorithm: account.algorithm,
            digits: account.digits,
            period: account.period,
            timeMs: now,
          });
          if (c !== lastCode) {
            lastCode = c;
            setCode(c);
            setFresh(true);
            window.setTimeout(() => setFresh(false), 380);
          }
        } catch {
          setCode("------");
        }
      }
      setTick((t) => (t + 1) % 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [account.secret, account.algorithm, account.digits, account.period]);

  const [left, right] = splitCode(code || "------");
  const showCode = !hideCodes || revealed;

  const remaining = secondsRemaining(account.period);
  const warn = remaining <= 5;

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
      toast({
        title: lang === "fr" ? "Code copié" : "Code copied",
        description: code,
      });
      // Auto-clear clipboard after the configured delay.
      const clearMs = settings?.clipboardClearMs ?? 20000;
      if (clearMs > 0) {
        window.setTimeout(async () => {
          try {
            const cur = await navigator.clipboard.readText().catch(() => "");
            if (cur === code) await navigator.clipboard.writeText("");
          } catch {}
        }, clearMs);
      }
    } catch {
      toast({
        title: lang === "fr" ? "Erreur" : "Error",
        description: lang === "fr" ? "Presse-papiers indisponible." : "Clipboard unavailable.",
        variant: "destructive",
      });
    }
  };

  const reveal = () => {
    if (hideCodes) setRevealed(account.id, !revealed);
    else copy();
  };

  const mainClick = hideCodes ? reveal : copy;

  return (
    <div
      className={`ga-card ga-card-hover ga-card-pressable group relative flex items-center gap-3.5 px-4 py-3.5 sm:px-5 sm:py-4 ${
        warn ? "ga-ring-warn" : ""
      } ${account.pinned ? "ring-1 ring-primary/25" : ""}`}
      data-account-id={account.id}
    >
      {/* Avatar */}
      <IssuerAvatar issuer={account.issuer} account={account.account} size={44} />

      {/* Tap zone — copy / reveal (issuer + email + big code) */}
      <button
        type="button"
        onClick={mainClick}
        className="flex min-w-0 flex-1 flex-col items-start text-left"
        aria-label={
          hideCodes
            ? revealed
              ? `Code for ${account.issuer || account.account}, tap to copy`
              : `Reveal code for ${account.issuer || account.account}`
            : `Copy code for ${account.issuer || account.account}`
        }
      >
        <div className="flex w-full items-center gap-1.5">
          <span className="truncate text-[15px] font-medium leading-tight text-foreground sm:text-base">
            {account.issuer || account.account}
          </span>
          {account.pinned && (
            <Pin className="h-3 w-3 shrink-0 fill-primary text-primary" aria-label="pinned" />
          )}
        </div>
        {account.issuer && account.account ? (
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {account.account}
          </span>
        ) : null}
        <span
          className={`ga-code mt-2 text-[30px] leading-none sm:text-[32px] ${fresh ? "ga-code-fresh" : ""} ${
            showCode ? "" : "tracking-[0.15em] blur-sm select-none"
          }`}
          style={{ color: warn ? "var(--ga-ring-warn)" : undefined }}
        >
          {showCode ? (
            <>
              {left}
              <span className="mx-1 inline-block w-[0.35em]" />
              {right}
            </>
          ) : (
            <span className="tracking-[0.3em]">••• •••</span>
          )}
        </span>
        {hideCodes && !revealed && (
          <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Eye className="h-3 w-3" />
            {lang === "fr" ? "Touchez pour révéler" : "Tap to reveal"}
          </span>
        )}
        {copied && (
          <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-success">
            <Copy className="h-3 w-3" />
            {lang === "fr" ? "Copié" : "Copied"}
          </span>
        )}
      </button>

      {/* Right side: countdown + overflow menu */}
      <div className="flex shrink-0 items-center gap-0.5">
        <CountdownRing period={account.period} size={44} stroke={3.5} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="ga-icon-btn h-9 w-9"
              aria-label={lang === "fr" ? "Actions" : "Actions"}
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => copy()}>
              <Copy className="mr-2 h-4 w-4" />
              {lang === "fr" ? "Copier le code" : "Copy code"}
            </DropdownMenuItem>
            {hideCodes && (
              <DropdownMenuItem onClick={() => setRevealed(account.id, !revealed)}>
                {revealed ? (
                  <EyeOff className="mr-2 h-4 w-4" />
                ) : (
                  <Eye className="mr-2 h-4 w-4" />
                )}
                {revealed
                  ? lang === "fr" ? "Masquer" : "Hide"
                  : lang === "fr" ? "Révéler" : "Reveal"}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => togglePinned(account.id)}>
              <Pin className="mr-2 h-4 w-4" />
              {account.pinned
                ? lang === "fr" ? "Désépingler" : "Unpin"
                : lang === "fr" ? "Épingler" : "Pin to top"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onShowQr(account)}>
              <QrCode className="mr-2 h-4 w-4" />
              {lang === "fr" ? "Afficher QR" : "Show QR"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(account)}>
              <Pencil className="mr-2 h-4 w-4" />
              {lang === "fr" ? "Modifier" : "Edit"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={async () => {
                const ok = await confirm({
                  title: lang === "fr" ? "Supprimer ce compte ?" : "Delete this account?",
                  description: lang === "fr"
                    ? `« ${account.issuer || account.account} » sera définitivement supprimé de votre coffre.`
                    : `“${account.issuer || account.account}” will be permanently removed from your vault.`,
                  confirmLabel: lang === "fr" ? "Supprimer" : "Delete",
                  cancelLabel: lang === "fr" ? "Annuler" : "Cancel",
                  variant: "destructive",
                });
                if (ok) {
                  deleteAccount(account.id);
                  toast({ title: lang === "fr" ? "Compte supprimé" : "Account deleted" });
                }
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {lang === "fr" ? "Supprimer" : "Delete"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {/* hidden tick ref to keep effect running */}
      <span className="sr-only">{tick}</span>
    </div>
  );
}
