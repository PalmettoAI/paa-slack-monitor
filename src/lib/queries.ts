import { db, flaggedMessages, monitoredThreads, sentResponses, slackWorkspaces, scanRuns } from "@/db";
import { and, desc, eq, gte, sql } from "drizzle-orm";

export async function listPendingMessages() {
  return db
    .select()
    .from(flaggedMessages)
    .where(eq(flaggedMessages.status, "pending"))
    .orderBy(desc(flaggedMessages.relevanceScore), desc(flaggedMessages.flaggedAt));
}

export async function listActiveThreads() {
  return db
    .select()
    .from(monitoredThreads)
    .where(and(eq(monitoredThreads.hasUnseenReply, true), sql`${monitoredThreads.dismissedAt} is null`))
    .orderBy(desc(monitoredThreads.lastCheckedAt));
}

export async function getStats() {
  const sevenDaysAgo = sql`now() - interval '7 days'`;

  const [flaggedThisWeek] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(flaggedMessages)
    .where(gte(flaggedMessages.flaggedAt, sevenDaysAgo));

  const [sentThisWeek] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sentResponses)
    .where(gte(sentResponses.sentAt, sevenDaysAgo));

  const [activeThreads] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(monitoredThreads)
    .where(sql`${monitoredThreads.dismissedAt} is null`);

  // Top keyword in the last 7 days. matched_keywords is a jsonb array; unnest it.
  const topKeywordRows = await db.execute<{ keyword: string; n: number }>(sql`
    select kw as keyword, count(*)::int as n
    from ${flaggedMessages},
         jsonb_array_elements_text(${flaggedMessages.matchedKeywords}) as kw
    where ${flaggedMessages.flaggedAt} >= now() - interval '7 days'
    group by kw
    order by n desc
    limit 1
  `);

  const [lastScan] = await db.select().from(scanRuns).orderBy(desc(scanRuns.startedAt)).limit(1);
  const [workspaceCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(slackWorkspaces)
    .where(eq(slackWorkspaces.active, true));

  return {
    flaggedThisWeek: flaggedThisWeek?.count ?? 0,
    sentThisWeek: sentThisWeek?.count ?? 0,
    activeThreads: activeThreads?.count ?? 0,
    topKeyword: topKeywordRows.rows[0]?.keyword ?? null,
    lastScanAt: lastScan?.startedAt ?? null,
    workspaces: workspaceCount?.count ?? 0,
  };
}

export async function listWorkspaces() {
  return db.select().from(slackWorkspaces).orderBy(desc(slackWorkspaces.installedAt));
}

export async function getMessageById(id: number) {
  const [row] = await db.select().from(flaggedMessages).where(eq(flaggedMessages.id, id)).limit(1);
  return row ?? null;
}
