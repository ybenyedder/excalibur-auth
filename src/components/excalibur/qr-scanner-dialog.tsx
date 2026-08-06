"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useVault } from "@/lib/store";
import { Camera, X, AlertCircle } from "lucide-react";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";

/**
 * Camera QR scanner. Uses @zxing/browser. Requires a secure context (HTTPS)
 * and camera permission.
 */
export function QrScannerDialog({
  open,
  onOpenChange,
  onScanned,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onScanned: (text: string) => void;
}) {
  const lang = useVault((s) => s.lang);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const controlsRef = React.useRef<IScannerControls | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [active, setActive] = React.useState(false);

  const stop = React.useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setActive(false);
  }, []);

  React.useEffect(() => {
    if (!open) {
      stop();
      setError(null);
      return;
    }
    if (!videoRef.current) return;
    setError(null);
    const reader = new BrowserMultiFormatReader();
    reader
      .decodeFromVideoDevice(undefined, videoRef.current, (result, _err, controls) => {
        controlsRef.current = controls;
        setActive(true);
        if (result) {
          const text = result.getText();
          if (text.startsWith("otpauth://")) {
            onScanned(text);
          }
        }
      })
      .catch((e) => {
        setError(
          e?.name === "NotAllowedError"
            ? lang === "fr"
              ? "Permission caméra refusée."
              : "Camera permission denied."
            : lang === "fr"
            ? "Caméra indisponible. Utilisez HTTPS et accordez la permission."
            : "Camera unavailable. Use HTTPS and grant permission."
        );
      });
    return () => {
      stop();
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) stop(); onOpenChange(v); }}>
      <DialogContent className="max-w-md gap-0 p-0">
        <DialogHeader className="flex-row items-center justify-between px-5 pt-5 pb-3">
          <DialogTitle className="text-lg font-medium">
            {lang === "fr" ? "Scanner un QR code" : "Scan QR code"}
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
        <div className="px-5 pb-5">
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-black">
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              muted
              playsInline
            />
            {/* Viewfinder overlay */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-8 rounded-2xl border-2 border-white/70" />
              <div className="absolute left-1/2 top-1/2 h-0.5 w-48 -translate-x-1/2 -translate-y-1/2 rounded bg-red-500/80" />
            </div>
            {!active && !error && (
              <div className="absolute inset-0 flex items-center justify-center text-white/80">
                <Camera className="h-8 w-8" />
              </div>
            )}
          </div>
          {error ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </p>
          ) : (
            <p className="mt-3 text-center text-sm text-muted-foreground">
              {lang === "fr"
                ? "Pointez votre caméra vers le QR code otpauth."
                : "Point your camera at the otpauth QR code."}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
