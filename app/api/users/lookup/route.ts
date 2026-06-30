import { auth, db } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const callsign = request.nextUrl.searchParams.get("callsign");
  if (!callsign || !callsign.trim()) {
    return NextResponse.json({ error: "MISSING_CALLSIGN" }, { status: 400 });
  }

  const result = await db.query(
    `SELECT id, callsign FROM "user" WHERE callsign = $1`,
    [callsign.trim()],
  );

  if (result.rowCount === 0) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const user = result.rows[0] as { id: string; callsign: string };
  return NextResponse.json(user);
}
