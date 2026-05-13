import { NextResponse, type NextRequest } from "next/server";
import { db, flaggedMessages } from "@/db";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });

  await db
    .update(flaggedMessages)
    .set({ status: "skipped", actionedAt: sql`now()` })
    .where(eq(flaggedMessages.id, id));

  return NextResponse.json({ ok: true });
}
