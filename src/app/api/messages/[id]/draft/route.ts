import { NextResponse, type NextRequest } from "next/server";
import { db, flaggedMessages } from "@/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Persist edits to a draft so the user's tweaks survive a refresh without
// requiring them to mark sent yet.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as { draftResponse?: string };
  const draft = (body.draftResponse ?? "").trim();
  if (!draft) return NextResponse.json({ error: "draftResponse required" }, { status: 400 });

  await db.update(flaggedMessages).set({ draftResponse: draft }).where(eq(flaggedMessages.id, id));
  return NextResponse.json({ ok: true });
}
