import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Lightweight server detection endpoint (used to switch local ↔ server mode). */
export async function GET() {
  return NextResponse.json({ app: "excalibur", version: 1, server: true });
}
