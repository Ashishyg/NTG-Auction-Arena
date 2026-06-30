import { NextResponse } from "next/server";
import { userIdFromToken, resolveAccount } from "@/lib/auth";

/**
 * POST /api/auth  { tournamentId }   Authorization: Bearer <handoff token>
 * Returns the caller's resolved role for this tournament, or 403 if they have
 * no access. Pages call this to gate the view and learn their team id.
 */
export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const { tournamentId } = await req.json().catch(() => ({}));
  if (!tournamentId) return NextResponse.json({ error: "tournamentId required" }, { status: 400 });

  const userId = userIdFromToken(token);
  if (!userId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const account = await resolveAccount(userId, tournamentId);
  if (!account) return NextResponse.json({ error: "Not registered for this tournament" }, { status: 403 });

  return NextResponse.json(account);
}
