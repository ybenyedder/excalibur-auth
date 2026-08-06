"use client";

import * as React from "react";
import { useVault } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Account } from "@/lib/types";
import { Logo } from "./logo";
import { AccountCard } from "./account-card";
import { AddAccountDialog } from "./add-account-dialog";
import { SettingsDialog } from "./settings-dialog";
import { QrShowDialog } from "./qr-show-dialog";
import {
  Plus,
  Search,
  Settings as SettingsIcon,
  Lock,
  ShieldCheck,
  KeyRound,
  X,
  GripVertical,
  Cloud,
  CloudOff,
  ArrowUpDown,
  Clock,
} from "lucide-react";

function SortableCard({
  account,
  onEdit,
  onShowQr,
}: {
  account: Account;
  onEdit: (a: Account) => void;
  onShowQr: (a: Account) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: account.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} className="relative">
      <AccountCard account={account} onEdit={onEdit} onShowQr={onShowQr} />
      {/* Drag handle — invisible until hover; uses listeners */}
      <button
        type="button"
        className="absolute left-1 top-1/2 -translate-y-1/2 cursor-grab touch-none rounded p-0.5 text-muted-foreground/40 opacity-0 transition-opacity hover:text-muted-foreground group-hover:opacity-100"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
    </div>
  );
}

export function MainScreen() {
  const { toast } = useToast();
  const payload = useVault((s) => s.payload);
  const mode = useVault((s) => s.mode);
  const profile = useVault((s) => s.profile);
  const lock = useVault((s) => s.lock);
  const lang = useVault((s) => s.lang);
  const reorderAccounts = useVault((s) => s.reorderAccounts);
  const settings = payload?.settings;
  const accounts = payload?.accounts ?? [];

  const [query, setQuery] = React.useState("");
  const [addOpen, setAddOpen] = React.useState(false);
  const [now, setNow] = React.useState(() => Date.now());
  const [editTarget, setEditTarget] = React.useState<Account | null>(null);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [qrTarget, setQrTarget] = React.useState<Account | null>(null);
  const [showSearch, setShowSearch] = React.useState(false);
  const [sortAlpha, setSortAlpha] = React.useState(false);

  const filtered = React.useMemo(() => {
    let list = accounts;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (a) =>
          a.issuer.toLowerCase().includes(q) ||
          a.account.toLowerCase().includes(q)
      );
    }
    // Pinned always first.
    const pinned = list.filter((a) => a.pinned);
    const rest = list.filter((a) => !a.pinned);
    if (sortAlpha) {
      pinned.sort((a, b) => (a.issuer || a.account).localeCompare(b.issuer || b.account));
      rest.sort((a, b) => (a.issuer || a.account).localeCompare(b.issuer || b.account));
    }
    return [...pinned, ...rest];
  }, [accounts, query, sortAlpha]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } })
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = filtered.map((a) => a.id);
    const oldI = ids.indexOf(active.id as string);
    const newI = ids.indexOf(over.id as string);
    if (oldI < 0 || newI < 0) return;
    // Reorder within the full accounts list (keeping non-filtered items stable).
    const fullIds = accounts.map((a) => a.id);
    const fullOld = fullIds.indexOf(active.id as string);
    const fullNew = fullIds.indexOf(over.id as string);
    const reordered = arrayMove(fullIds, fullOld, fullNew);
    reorderAccounts(reordered);
  };

  // Auto-lock on inactivity + Esc + tab-hide. + global keyboard shortcuts.
  // Pause auto-lock while any dialog is open (settings, add, QR) so the user
  // isn't logged out mid-edit.
  const anyDialogOpen = addOpen || settingsOpen || !!qrTarget;
  React.useEffect(() => {
    const idle = settings?.autolockSeconds ?? 90;
    let t: number | undefined;
    const reset = () => {
      if (!idle) return;
      window.clearTimeout(t);
      if (anyDialogOpen) return; // don't arm while a dialog is open
      t = window.setTimeout(() => lock(), idle * 1000);
    };
    const events = ["mousedown", "keydown", "touchstart", "scroll", "wheel"];
    events.forEach((ev) => window.addEventListener(ev, reset, { passive: true }));
    reset();
    const onKey = (e: KeyboardEvent) => {
      // Don't interfere with text entry.
      const el = e.target as HTMLElement | null;
      const typing =
        el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
      if (e.key === "Escape") {
        // If a dialog is open, let Esc close it (Radix handles this) instead of
        // locking the vault.
        if (!anyDialogOpen) lock();
        return;
      }
      if (typing) return;
      // Shortcut: "/" focus search, "n" or "+" add, "s" settings, "l" lock.
      if (e.key === "/") {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => {
          const inp = document.querySelector<HTMLInputElement>('input[type="search"]');
          inp?.focus();
        }, 60);
      } else if (e.key === "n" || e.key === "+" || (e.key === "a" && !e.metaKey && !e.ctrlKey)) {
        e.preventDefault();
        setEditTarget(null);
        setAddOpen(true);
      } else if (e.key === "s") {
        e.preventDefault();
        setSettingsOpen(true);
      } else if (e.key === "l") {
        e.preventDefault();
        lock();
      } else if (e.key === "?") {
        e.preventDefault();
        toast({
          title: lang === "fr" ? "Raccourcis clavier" : "Keyboard shortcuts",
          description:
            lang === "fr"
              ? "/ rechercher · n ajouter · s réglages · l verrouiller · Échap verrouiller"
              : "/ search · n add · s settings · l lock · Esc lock",
        });
      }
    };
    const onVis = () => {
      if (document.visibilityState === "hidden" && settings?.lockOnHide) lock();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearTimeout(t);
      events.forEach((ev) => window.removeEventListener(ev, reset));
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [settings?.autolockSeconds, settings?.lockOnHide, lock, lang, anyDialogOpen]);

  const onEdit = (a: Account) => {
    setEditTarget(a);
    setAddOpen(true);
  };
  const onShowQr = (a: Account) => setQrTarget(a);

  // Live clock tick (every second).
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const onAddClose = (v: boolean) => {
    setAddOpen(v);
    if (!v) setEditTarget(null);
  };

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Top app bar — Material 3 */}
      <header className="ga-appbar sticky top-0 z-30 border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-2xl items-center gap-2 px-4 sm:px-5">
          <div className="text-primary">
            <Logo size={24} />
          </div>
          <span className="text-xl font-medium tracking-tight">Excalibur</span>
          {mode === "server" && profile && (
            <span className="ml-1 hidden items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary sm:inline-flex">
              <Cloud className="h-3 w-3" />
              {profile}
            </span>
          )}
          {mode === "local" && (
            <span className="ml-1 hidden items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground sm:inline-flex">
              <CloudOff className="h-3 w-3" />
              {lang === "fr" ? "Hors ligne" : "Offline"}
            </span>
          )}
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => setShowSearch((v) => !v)}
            className="ga-icon-btn"
            aria-label={lang === "fr" ? "Rechercher" : "Search"}
          >
            {showSearch ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={() => setSortAlpha((v) => !v)}
            className={`ga-icon-btn ${sortAlpha ? "text-primary" : ""}`}
            aria-label={lang === "fr" ? "Trier" : "Sort"}
            title={lang === "fr" ? "Trier A→Z" : "Sort A→Z"}
          >
            <ArrowUpDown className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="ga-icon-btn"
            aria-label={lang === "fr" ? "Réglages" : "Settings"}
          >
            <SettingsIcon className="h-5 w-5" />
          </button>
        </div>
        {/* Search bar — slides in */}
        {showSearch && (
          <div className="mx-auto max-w-2xl px-4 pb-3 sm:px-5">
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={lang === "fr" ? "Filtrer les comptes…" : "Search accounts…"}
              className="ga-field h-11 text-sm"
            />
          </div>
        )}
      </header>

      {/* Account list */}
      <main className="mx-auto w-full max-w-2xl flex-1 px-3 py-5 sm:px-5">
        {accounts.length === 0 ? (
          <EmptyState onAdd={() => setAddOpen(true)} />
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {lang === "fr" ? "Aucun résultat." : "No results."}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={filtered.map((a) => a.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="group flex flex-col gap-2.5">
                {filtered.map((a) => (
                  <SortableCard
                    key={a.id}
                    account={a}
                    onEdit={onEdit}
                    onShowQr={onShowQr}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Footer status bar */}
        <div className="mt-8 flex items-center justify-between px-1 pb-28 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3 text-success" />
            {accounts.length} {lang === "fr" ? "comptes" : "accounts"}
            {" · "}
            {settings?.hideCodes
              ? lang === "fr" ? "codes masqués" : "codes hidden"
              : lang === "fr" ? "codes visibles" : "codes visible"}
          </span>
          <span className="flex items-center gap-2 tnum">
            <Clock className="h-3 w-3" />
            {fmtClock(now)}
            <span className="mx-1 opacity-40">·</span>
            <KeyRound className="h-3 w-3" />
            {lang === "fr" ? "Échap verrouille" : "Esc locks"}
          </span>
        </div>
      </main>

      {/* FAB — circular blue, Material 3 */}
      <button
        type="button"
        onClick={() => setAddOpen(true)}
        className="ga-fab fixed bottom-6 right-6 z-30 sm:bottom-8 sm:right-8"
        aria-label={lang === "fr" ? "Ajouter un compte" : "Add account"}
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>

      {/* Lock FAB (secondary, left) — smaller, neutral tonal */}
      <button
        type="button"
        onClick={lock}
        className="ga-fab-secondary fixed bottom-6 left-6 z-30 hidden sm:bottom-8 sm:left-8 sm:flex"
        aria-label={lang === "fr" ? "Verrouiller" : "Lock"}
        title={lang === "fr" ? "Verrouiller (Échap)" : "Lock (Esc)"}
      >
        <Lock className="h-5 w-5" />
      </button>

      <AddAccountDialog open={addOpen} onOpenChange={onAddClose} editing={editTarget} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <QrShowDialog account={qrTarget} onOpenChange={(v) => !v && setQrTarget(null)} />
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  const lang = useVault((s) => s.lang);
  return (
    <div className="ga-fade flex flex-col items-center justify-center px-5 py-24 text-center">
      <div className="ga-card flex h-24 w-24 items-center justify-center rounded-full" style={{ boxShadow: "var(--ga-elev-2)" }}>
        <KeyRound className="h-10 w-10 text-primary" strokeWidth={1.75} />
      </div>
      <h2 className="mt-6 text-xl font-medium">
        {lang === "fr" ? "Aucun compte" : "No accounts yet"}
      </h2>
      <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted-foreground">
        {lang === "fr"
          ? "Ajoutez votre premier code avec un lien otpauth://, un QR code ou une saisie manuelle."
          : "Add your first code with an otpauth:// link, a QR code, or manual entry."}
      </p>
      <button type="button" onClick={onAdd} className="ga-btn-primary mt-6">
        <Plus className="h-4 w-4" />
        {lang === "fr" ? "Ajouter un compte" : "Add an account"}
      </button>
    </div>
  );
}

function fmtClock(ms: number): string {
  const d = new Date(ms);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  const s = d.getSeconds().toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}
