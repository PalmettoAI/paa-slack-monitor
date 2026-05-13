// Index ping for /api/cron — keeps the public-prefix middleware match safe.
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({
    endpoints: ["/api/cron/scan", "/api/cron/thread-watch"],
  });
}
