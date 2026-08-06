"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useVault } from "@/lib/store";
import { formatOtpauth } from "@/lib/totp";
import type { Account } from "@/lib/types";
import QRCode from "qrcode";
import { Download, Copy, X } from "lucide-react";

/**
 * Display a QR code for an account (so it can be imported to another device).
 */
export function QrShowDialog({
  account,
  onOpenChange,
}: {
  account: Account | null;
  onOpenChange: (v: boolean) => void;
}) {
  const lang = useVault((s) => s.lang);
  const [dataUrl, setDataUrl] = React.useState<string>("");

  React.useEffect(() => {
    if (!account) return;
    const uri = formatOtpauth(account);
    QRCode.toDataURL(uri, { width: 320, margin: 1, color: { dark: "#1b1b1f", light: "#ffffff" } })
      .then(setDataUrl)
      .catch(() => setDataUrl(""));
  }, [account]);

  if (!account) return null;
  const uri = formatOtpauth(account);

  const copy = () => {
    navigator.clipboard.writeText(uri);
  };

  const download = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${account.issuer || account.account || "otp"}.png`;
    a.click();
  };

  return (
    <Dialog open={!!account} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs gap-0 p-0">
        <DialogHeader className="flex-row items-center justify-between px-5 pt-5 pb-3">
          <DialogTitle className="text-lg font-medium">
            {account.issuer || account.account}
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
        <div className="flex flex-col items-center gap-4 px-5 pb-5">
          <div className="rounded-2xl bg-white p-4">
            {dataUrl ? (
              <img src={dataUrl} alt="QR code" className="h-56 w-56" />
            ) : (
              <div className="h-56 w-56 animate-pulse bg-muted" />
            )}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            {account.account}
          </p>
          <div className="flex w-full gap-2">
            <button onClick={copy} className="ga-btn-outline flex-1">
              <Copy className="h-4 w-4" />
              {lang === "fr" ? "Copier le lien" : "Copy link"}
            </button>
            <button onClick={download} className="ga-btn-outline flex-1">
              <Download className="h-4 w-4" />
              PNG
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
