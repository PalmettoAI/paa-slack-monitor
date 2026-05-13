import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { db, monitoredThreads, slackWorkspaces } from "@/db";
import { clientForToken } from "@/lib/slack";
import { eq, sql, and } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function authed(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") ?? "";
  if (auth.startsWith("Bearer ") && auth.slice(7) === env.cronSecret()) return true;
  const q = req.nextUrl.searchParams.get("secret");
  if (q && q === env.cronSecret()) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const threads = await db
    .select()
    .from(monitoredThreads)
    .where(sql`${monitoredThreads.dismissedAt} is null`);

  const wsRows = await db.select().from(slackWorkspaces);
  const wsMap = new Map(wsRows.map((w) => [w.workspaceId, w] as const));

  let checked = 0;
  let newReplies = 0;
  const errors: Array<{ threadId: number; error: string }> = [];

  for (const t of threads) {
    const ws = wsMap.get(t.workspaceId);
    if (!ws) continue;
    checked++;
    try {
      const slack = clientForToken(ws.userToken);
      const r = await slack.conversations.replies({
        channel: t.channelId,
        ts: t.threadTs,
        limit: 50,
      });
      const replies = (r.messages ?? []).filter((m) => m.ts && m.ts !== t.threadTs);
      // Sort by ts ascending
      replies.sort((a, b) => Number(a.ts) - Number(b.ts));
      const last = replies[replies.length - 1];
      if (!last?.ts) {
        await db
          .update(monitoredThreads)
          .set({ lastCheckedAt: sql`now()` })
          .where(eq(monitoredThreads.id, t.id));
        continue;
      }

      const isNew = !t.lastSeenReplyTs || Number(last.ts) > Number(t.lastSeenReplyTs);
      const isFromOther = last.user && last.user !== ws.slackUserId;

      await db
        .update(monitoredThreads)
        .set({
          lastSeenReplyTs: last.ts,
          lastReplyText: last.text ?? null,
          lastReplyUser: last.user ?? null,
          hasUnseenReply: isNew && !!isFromOther ? true : t.hasUnseenReply,
          lastCheckedAt: sql`now()`,
        })
        .where(eq(monitoredThreads.id, t.id));

      if (isNew && isFromOther) newReplies++;
    } catch (err) {
      errors.push({ threadId: t.id, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({ ok: true, checked, newReplies, errors });
}
