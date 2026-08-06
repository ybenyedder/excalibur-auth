"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
}

export interface PromptOptions {
  title: string;
  description?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: "text" | "password";
  minLength?: number;
}

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  prompt: (opts: PromptOptions) => Promise<string | null>;
}

const ConfirmContext = React.createContext<ConfirmContextValue | null>(null);

/** Provider that renders the AlertDialog + prompt dialog. Wrap the app once. */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmOpts, setConfirmOpts] = React.useState<ConfirmOptions | null>(null);
  const [promptOpen, setPromptOpen] = React.useState(false);
  const [promptOpts, setPromptOpts] = React.useState<PromptOptions | null>(null);
  const [promptValue, setPromptValue] = React.useState("");
  const confirmResolver = React.useRef<((v: boolean) => void) | null>(null);
  const promptResolver = React.useRef<((v: string | null) => void) | null>(null);

  const confirm = React.useCallback((o: ConfirmOptions) => {
    setConfirmOpts(o);
    setConfirmOpen(true);
    return new Promise<boolean>((resolve) => {
      confirmResolver.current = resolve;
    });
  }, []);

  const prompt = React.useCallback((o: PromptOptions) => {
    setPromptOpts(o);
    setPromptValue("");
    setPromptOpen(true);
    return new Promise<string | null>((resolve) => {
      promptResolver.current = resolve;
    });
  }, []);

  const handleConfirm = (result: boolean) => {
    setConfirmOpen(false);
    confirmResolver.current?.(result);
    confirmResolver.current = null;
  };

  const handlePrompt = (result: string | null) => {
    setPromptOpen(false);
    promptResolver.current?.(result);
    promptResolver.current = null;
  };

  return (
    <ConfirmContext.Provider value={{ confirm, prompt }}>
      {children}

      {/* Confirm AlertDialog */}
      <AlertDialog open={confirmOpen} onOpenChange={(v) => { if (!v) handleConfirm(false); }}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            {confirmOpts?.variant === "destructive" && (
              <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
            )}
            <AlertDialogTitle className="text-lg font-medium">
              {confirmOpts?.title}
            </AlertDialogTitle>
            {confirmOpts?.description && (
              <AlertDialogDescription className="text-sm leading-relaxed">
                {confirmOpts.description}
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel onClick={() => handleConfirm(false)}>
              {confirmOpts?.cancelLabel || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleConfirm(true)}
              className={
                confirmOpts?.variant === "destructive"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              {confirmOpts?.confirmLabel || "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Prompt Dialog */}
      <AlertDialog open={promptOpen} onOpenChange={(v) => { if (!v) handlePrompt(null); }}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-medium">
              {promptOpts?.title}
            </AlertDialogTitle>
            {promptOpts?.description && (
              <AlertDialogDescription className="text-sm leading-relaxed">
                {promptOpts.description}
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <input
            type={promptOpts?.type || "text"}
            className="ga-field mt-2 font-mono"
            placeholder={promptOpts?.placeholder}
            value={promptValue}
            onChange={(e) => setPromptValue(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (!promptOpts?.minLength || promptValue.length >= promptOpts.minLength) {
                  handlePrompt(promptValue);
                }
              }
            }}
          />
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel onClick={() => handlePrompt(null)}>
              {promptOpts?.cancelLabel || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handlePrompt(promptValue)}
              disabled={!!promptOpts?.minLength && promptValue.length < promptOpts.minLength}
            >
              {promptOpts?.confirmLabel || "OK"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

/** Hook to access confirm() and prompt(). Must be used inside <ConfirmProvider>. */
export function useConfirm() {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return ctx;
}
