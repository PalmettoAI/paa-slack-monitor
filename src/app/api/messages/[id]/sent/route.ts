import { NextResponse, type NextRequest } from "next/server";
import { db, flaggedMessages, sentResponses, monitoredThreads } from "@/db";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as { finalText?: string };
  const finalText = (body.finalText ?? "").trim();
  if (!finalText) return NextResponse.json({ error: "finalText required" }, { status: 400 });

  const [msg] = await db.select().from(flaggedMessages).where(eq(flaggedMessages.id, id)).limit(1);
  if (!msg) return NextResponse.json({ error: "not found" }, { status: 404 });

  await db
    .update(flaggedMessages)
    .set({ status: "sent", actionedAt: sql`now()`, draftResponse: finalText })
    .where(eq(flaggedMessages.id, id));

  await db.insert(sentResponses).values({ flaggedMessageId: id, finalText });

  // Start watching the thread for follow-up replies. The "thread root" for a
  // top-level message is the message itself; for an in-thread reply Deniz
  // responded to, it's the existing thread_ts.
  const threadTs = msg.threadTs ?? msg.messageTs;
  await db
    .insert(monitoredThreads)
    .values({
      flaggedMessageId: id,
      workspaceId: msg.workspaceId,
      channelId: msg.channelId,
      threadTs,
      permalink: msg.permalink,
    })
    .onConflictDoNothing();

  return NextResponse.json({ ok: true });
}
