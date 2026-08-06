import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { NAME_RE, ctEqual, isFrozen, registerFailure } from "@/lib/server-auth";
import type { ProfileInfo, VaultBlob } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/profiles
 *   List all profile names + public KDF parameters (salt + iterations). The
 *   salt is part of the vault envelope (not encrypted) and is required for the
 *   client to derive the auth token *before* fetching the encrypted blob.
 *   Profile names are not secret (they're shown on the picker screen anyway).
 *
 * POST /api/profiles
 *   Create a new profile. Body: { name, tokenHash, vault }
 *   - name: validated against NAME_RE
 *   - tokenHash: SHA-256 hex of the derived auth token
 *   - vault: encrypted VaultBlob (JSON string)
 */
export async function GET() {
  const rows = await db.profile.findMany({
    orderBy: { updatedAt: "desc" },
    select: { name: true, createdAt: true, updatedAt: true, vault: true },
  });
  const items: (ProfileInfo & { salt?: string; iterations?: number })[] = rows.map((p) => {
    let salt: string | undefined;
    let iterations: number | undefined;
    try {
      const blob = JSON.parse(p.vault) as VaultBlob;
      if (blob?.kdf?.salt) salt = blob.kdf.salt;
      if (blob?.kdf?.iterations) iterations = blob.kdf.iterations;
    } catch {}
    return {
      name: p.name,
      createdAt: p.createdAt.getTime(),
      updatedAt: p.updatedAt.getTime(),
      salt,
      iterations,
    };
  });
  return NextResponse.json({ profiles: items });
}

export async function POST(req: NextRequest) {
  let body: { name?: string; tokenHash?: string; vault?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = (body.name || "").trim();
  const tokenHash = body.tokenHash || "";
  const vault = body.vault;

  if (!NAME_RE.test(name)) {
    return NextResponse.json({ error: "Invalid profile name" }, { status: 400 });
  }
  if (!/^[a-f0-9]{64}$/.test(tokenHash)) {
    return NextResponse.json({ error: "Invalid token hash" }, { status: 400 });
  }
  if (!vault || typeof vault !== "object") {
    return NextResponse.json({ error: "Missing vault" }, { status: 400 });
  }

  const existing = await db.profile.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json({ error: "Profile already exists" }, { status: 409 });
  }

  await db.profile.create({
    data: {
      name,
      tokenHash,
      vault: JSON.stringify(vault),
      version: 1,
    },
  });

  return NextResponse.json({ ok: true, name }, { status: 201 });
}

/**
 * Verify the bearer token against a profile record.
 * Returns the profile on success, or null (and registers a failure) on mismatch.
 */
export async function verifyProfile(
  req: NextRequest,
  name: string
): Promise<
  | { ok: true; profile: Awaited<ReturnType<typeof db.profile.findUnique>> }
  | { ok: false; status: number; error: string; retryAfter?: number }
> {
  if (!NAME_RE.test(name)) {
    return { ok: false, status: 400, error: "Invalid profile name" };
  }
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    return { ok: false, status: 401, error: "Missing or invalid token" };
  }
  // Server stores hashToken(token) = SHA-256(token). Hash the incoming bearer
  // token and compare in constant time.
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const profile = await db.profile.findUnique({ where: { name } });
  if (!profile) {
    return { ok: false, status: 401, error: "Invalid credentials" };
  }
  if (isFrozen(profile)) {
    const retryAfter = Math.ceil(
      (profile.frozenUntil!.getTime() - Date.now()) / 1000
    );
    return {
      ok: false,
      status: 429,
      error: "Too many attempts. Try again later.",
      retryAfter,
    };
  }
  if (!ctEqual(profile.tokenHash, tokenHash)) {
    const r = await registerFailure(name);
    if (r.retryAfterMs > 0) {
      return {
        ok: false,
        status: 429,
        error: "Too many attempts. Try again later.",
        retryAfter: Math.ceil(r.retryAfterMs / 1000),
      };
    }
    return { ok: false, status: 401, error: "Invalid credentials" };
  }
  return { ok: true, profile };
}
