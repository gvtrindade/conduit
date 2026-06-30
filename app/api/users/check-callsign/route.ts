import { db } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const callsign = request.nextUrl.searchParams.get("callsign");
  if (!callsign || !callsign.trim()) {
    return NextResponse.json({ available: false }, { status: 400 });
  }

  const result = await db.query(
    `SELECT 1 FROM "user" WHERE callsign = $1`,
    [callsign.trim()],
  );

  const available = result.rowCount === 0;
  return NextResponse.json({ available });
}
