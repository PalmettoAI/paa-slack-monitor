import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { runScan } from "@/lib/scanner";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authed(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") ?? "";
  if (auth.startsWith("Bearer ") && auth.slice(7) === env.cronSecret()) return true;
  const q = req.nextUrl.searchParams.get("secret");
  if (q && q === env.cronSecret()) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const summary = await runScan();
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    console.error("[scan] failed:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
