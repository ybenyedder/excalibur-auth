import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clearFailures } from "@/lib/server-auth";
import { verifyProfile } from "../../profiles/route";
import type { VaultBlob } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/vault/:name
 *   Fetch the encrypted vault blob for a profile. Requires Bearer token
 *   (the hex auth token derived client-side; server stores only its hash).
 *
 * PUT /api/vault/:name
 *   Replace the encrypted vault blob (e.g. after adding/editing an account,
 *   changing the passphrase, or wiping). Body: { vault, version? }
 *   - version: optional optimistic-concurrency check
 *
 * DELETE /api/vault/:name
 *   Permanently delete a profile + its vault. Requires the bearer token.
 */

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ name: string }> }
) {
  const { name } = await ctx.params;
  const v = await verifyProfile(_req, name);
  if (!v.ok) {
    return NextResponse.json({ error: v.error }, { status: v.status });
  }
  const profile = v.profile!;
  await clearFailures(name);
  let blob: unknown = null;
  try {
    blob = JSON.parse(profile.vault);
  } catch {
    blob = null;
  }
  return NextResponse.json({
    vault: blob,
    version: profile.version,
    updatedAt: profile.updatedAt.getTime(),
  });
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ name: string }> }
) {
  const { name } = await ctx.params;
  const v = await verifyProfile(req, name);
  if (!v.ok) {
    return NextResponse.json({ error: v.error }, { status: v.status });
  }
  const profile = v.profile!;
  await clearFailures(name);

  let body: { vault?: unknown; version?: number; resealed?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.vault || typeof body.vault !== "object") {
    return NextResponse.json({ error: "Missing vault" }, { status: 400 });
  }

  // Optional optimistic-concurrency check.
  if (typeof body.version === "number" && body.version !== profile.version) {
    return NextResponse.json(
      { error: "Vault was modified elsewhere. Reload and retry." },
      { status: 409 }
    );
  }

  const updated = await db.profile.update({
    where: { name },
    data: {
      vault: JSON.stringify(body.vault as VaultBlob),
      // Optional: rotate the auth token hash (passphrase change).
      ...(body.resealed && req.headers.get("x-new-token-hash")
        ? { tokenHash: req.headers.get("x-new-token-hash")! }
        : {}),
      version: { increment: 1 },
    },
    select: { version: true, updatedAt: true },
  });

  return NextResponse.json({
    ok: true,
    version: updated.version,
    updatedAt: updated.updatedAt.getTime(),
  });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ name: string }> }
) {
  const { name } = await ctx.params;
  const v = await verifyProfile(req, name);
  if (!v.ok) {
    return NextResponse.json({ error: v.error }, { status: v.status });
  }
  await db.profile.delete({ where: { name } });
  return NextResponse.json({ ok: true });
}
