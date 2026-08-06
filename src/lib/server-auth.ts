/**
 * Excalibur server-side helpers — constant-time compare, rate-limit gates,
 * profile name validation.
 *
 * These run on the server (Next.js API routes) and only ever handle the
 * *hashed* auth token, never the encryption key.
 */

import { db } from "@/lib/db";
import type { Profile } from "@prisma/client";

/** Strict profile name regex (lowercase, digits, dash, underscore, 1–32 chars). */
export const NAME_RE = /^[a-z0-9][a-z0-9_-]{0,31}$/;

/** Constant-time string comparison. Inputs must be the same length. */
export function ctEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Max auth failures before freeze, and freeze duration. */
const MAX_FAILS = 5;
const FREEZE_MS = 5 * 60 * 1000;

/** Returns true if the profile is currently frozen (rate-limited). */
export function isFrozen(p: Pick<Profile, "frozenUntil">): boolean {
  return !!p.frozenUntil && p.frozenUntil.getTime() > Date.now();
}

/** Increment fail count, freeze if threshold reached. */
export async function registerFailure(name: string): Promise<{ retryAfterMs: number }> {
  const p = await db.profile.findUnique({ where: { name } });
  if (!p) return { retryAfterMs: 0 };
  const failCount = p.failCount + 1;
  const now = new Date();
  let frozenUntil: Date | null = p.frozenUntil;
  if (failCount >= MAX_FAILS) {
    frozenUntil = new Date(now.getTime() + FREEZE_MS);
  }
  await db.profile.update({
    where: { name },
    data: { failCount, lastFailAt: now, frozenUntil },
  });
  return {
    retryAfterMs: frozenUntil && frozenUntil.getTime() > now.getTime()
      ? frozenUntil.getTime() - now.getTime()
      : 0,
  };
}

/** Reset fail counter on successful auth. */
export async function clearFailures(name: string): Promise<void> {
  await db.profile.update({
    where: { name },
    data: { failCount: 0, lastFailAt: null, frozenUntil: null },
  });
}

export const RATE_LIMIT = { MAX_FAILS, FREEZE_MS };
