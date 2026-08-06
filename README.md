# ⚔️ Excalibur — Authenticator

A self-hosted, **zero-knowledge** TOTP authenticator with a **Google Authenticator-inspired Material 3 UI**. Built with Next.js 16, TypeScript, Tailwind CSS 4, and shadcn/ui.

> Rebuilt from [ybenyedder/excalibur](https://github.com/ybenyedder/excalibur) — a vanilla Node.js + HTML/CSS authenticator — into a modern Next.js app that closely resembles Google Authenticator.

---

## ✨ Features

### 🔐 Security (zero-knowledge, ported from original)
- **AES-256-GCM** encryption with **PBKDF2-SHA256** key derivation (600,000 iterations)
- Single PBKDF2 pass derives 512 bits → split into **encryption key** (bytes 0–31, never leaves browser) + **auth token** (bytes 32–63, only SHA-256 hash stored server-side)
- Server never sees your passphrase, encryption key, or plaintext accounts
- **Rate-limiting**: 5 failed unlock attempts → 5-minute freeze per profile
- **Constant-time** token comparison (anti-timing attacks)
- Encrypted vault blob stored server-side; 10 last versions kept

### 📱 Google Authenticator-style UI (Material 3)
- **Account cards** with issuer avatar, account email, big spaced monospace code, circular countdown ring
- Codes turn **red and pulse** in the last 5 seconds of the window
- **Deterministic per-issuer colors** (Material You tonal palette)
- **FAB** (floating action button) for adding accounts — circular Google Blue
- Material 3 top app bar with translucent blur
- Clean light/dark themes with Google Blue (#1a73e8) accent

### 🛠️ Functionality
- **TOTP** (RFC 6238) — SHA-1/SHA-256/SHA-512, 6/7/8 digits, custom period
- **QR code scanning** via camera (`@zxing/browser`)
- **QR code generation** for sharing accounts to another device (`qrcode`)
- **Drag-and-drop reorder** of accounts (`@dnd-kit`)
- **Pin-to-top** favorite accounts
- **Search** and **sort A→Z**
- **Bulk import** — paste multiple `otpauth://` URIs at once
- **Tap-to-copy** code with clipboard auto-clear
- **Auto-lock** on inactivity (configurable: 30s–5min or never)
- **Lock on tab hide** (optional)
- **Panic lock** — press `Esc` to instantly purge keys from memory
- **Hide-codes privacy mode** — codes masked until tapped

### 🎨 UX polish
- **Light / Dark / System** theme toggle (`next-themes`)
- **EN / FR** internationalization
- **Keyboard shortcuts**: `/` search · `n` add · `s` settings · `l` lock · `?` help
- **Live clock** in status bar
- **Stats dashboard** (account count, pinned count)
- **Encrypted export/import** (vault blob, requires passphrase)
- **Passphrase change** (re-seals vault with new salt + key + token)
- **PWA manifest** (installable, standalone display)
- **AlertDialog-based confirmations** (no jarring native `confirm()`)
- Responsive (mobile-first), accessible (ARIA, keyboard nav, screen-reader friendly)

---

## 🚀 Quick start

### Prerequisites
- Node.js ≥ 18
- Bun (recommended) or npm

### Install & run

```bash
bun install          # or npm install
bun run db:push      # create the SQLite database
bun run dev          # start dev server on http://localhost:3000
```

### Production build

```bash
bun run build
bun run start
```

---

## 🏗️ Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── ping/route.ts              # Server detection
│   │   ├── profiles/route.ts          # List + create profiles, verifyProfile()
│   │   └── vault/[name]/route.ts      # GET/PUT/DELETE encrypted vault
│   ├── globals.css                    # Material 3 design system
│   ├── layout.tsx                     # Roboto fonts, ThemeProvider, metadata
│   └── page.tsx                       # Renders <Authenticator />
├── components/
│   ├── excalibur/
│   │   ├── authenticator.tsx          # Screen router (setup/lock/profiles/main)
│   │   ├── setup-screen.tsx           # First-run vault creation
│   │   ├── lock-screen.tsx            # Passphrase unlock
│   │   ├── profiles-screen.tsx        # Server mode: pick profile
│   │   ├── main-screen.tsx            # Account list, topbar, FAB, shortcuts
│   │   ├── account-card.tsx           # GA-style card with countdown ring
│   │   ├── countdown-ring.tsx         # Animated SVG timer (red < 5s)
│   │   ├── issuer-avatar.tsx          # Deterministic-hue circle
│   │   ├── add-account-dialog.tsx     # 3 tabs: otpauth / manual / QR scan
│   │   ├── qr-scanner-dialog.tsx      # Camera QR scanning
│   │   ├── qr-show-dialog.tsx         # QR generation + PNG download
│   │   ├── settings-dialog.tsx        # Full settings panel
│   │   ├── confirm-provider.tsx       # AlertDialog-based confirm/prompt
│   │   └── logo.tsx                   # Brand mark
│   └── ui/                            # shadcn/ui components
├── lib/
│   ├── totp.ts                        # RFC 4226/6238 TOTP/HOTP
│   ├── vault.ts                       # AES-256-GCM + PBKDF2 crypto
│   ├── store.ts                       # Zustand vault store
│   ├── server-auth.ts                 # Rate-limiting, constant-time compare
│   ├── types.ts                       # Account, VaultPayload, VaultBlob…
│   └── i18n.ts                        # EN + FR strings
└── prisma/
    └── schema.prisma                  # Profile model (name, tokenHash, vault)
```

---

## 🔑 Security model

### How it works

1. **You choose a passphrase** — it never leaves the browser.
2. **PBKDF2-SHA256** (600k iterations, 128-bit salt) derives **512 bits** in a single pass:
   - Bytes 0–31 → **AES-256-GCM key** (encrypts the vault; stays in browser memory only)
   - Bytes 32–63 → **auth token** (sent to server; server stores only `SHA-256(token)`)
3. The server **cannot** reconstruct the encryption key — it only ever sees the auth token's hash.
4. Even with a full database dump, an attacker gets only **encrypted vaults** + **token hashes**.
5. **AES-GCM** authenticates the data — a tampered vault = decryption failure.

### Rate-limiting
- 5 failed unlock attempts → profile frozen for 5 minutes
- Per-profile, constant-time token comparison

### What the server stores
| Field | Content |
|---|---|
| `name` | Profile name (public, shown on picker) |
| `tokenHash` | `SHA-256(auth_token)` — cannot be reversed |
| `vault` | Encrypted JSON blob (AES-256-GCM) |
| `version` | Optimistic-concurrency counter |
| `failCount` / `frozenUntil` | Rate-limit state |

---

## ⌨️ Keyboard shortcuts

| Key | Action |
|---|---|
| `/` | Focus search |
| `n` or `+` | Add account |
| `s` | Open settings |
| `l` | Lock vault |
| `Esc` | Lock vault (or close dialog) |
| `?` | Show shortcuts help |

---

## 📦 Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS 4 + shadcn/ui (New York) |
| State | Zustand (client), TanStack Query (server) |
| Database | Prisma ORM + SQLite |
| Crypto | WebCrypto API (PBKDF2, AES-GCM, HMAC) |
| QR | `qrcode` (gen) + `@zxing/browser` (scan) |
| Drag | `@dnd-kit` |
| Theme | `next-themes` |
| Fonts | Roboto + Roboto Mono (`next/font`) |

---

## 📝 License

MIT — same as the original Excalibur.

---

## 🙏 Credits

- Original Excalibur: [ybenyedder/excalibur](https://github.com/ybenyedder/excalibur)
- UI inspiration: Google Authenticator (Material 3)
- Built with [Z.ai Code](https://z.ai)
