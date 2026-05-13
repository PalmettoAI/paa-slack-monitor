import { db, slackWorkspaces, flaggedMessages, scanRuns, type SlackWorkspace } from "@/db";
import { clientForToken } from "./slack";
import { matchKeywords, passesPreFilter } from "./keywords";
import { scoreRelevance, RELEVANCE_THRESHOLD } from "./relevance";
import { draftResponse } from "./draft";
import { env } from "./env";
import { eq, sql } from "drizzle-orm";

const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;

export type ScanSummary = {
  runId: number;
  workspacesScanned: number;
  channelsScanned: number;
  messagesSeen: number;
  messagesFlagged: number;
  errors: Array<{ where: string; error: string }>;
};

export async function runScan(): Promise<ScanSummary> {
  const [run] = await db.insert(scanRuns).values({}).returning();
  const summary: ScanSummary = {
    runId: run.id,
    workspacesScanned: 0,
    channelsScanned: 0,
    messagesSeen: 0,
    messagesFlagged: 0,
    errors: [],
  };

  const workspaces = await db.select().from(slackWorkspaces).where(eq(slackWorkspaces.active, true));
  const excludePatterns = env.slack.excludeChannels();
  const cutoffTs = (Math.floor(Date.now() / 1000) - SEVEN_DAYS_SECONDS).toString();

  for (const ws of workspaces) {
    summary.workspacesScanned++;
    try {
      await scanWorkspace(ws, cutoffTs, excludePatterns, summary);
      await db
        .update(slackWorkspaces)
        .set({ lastScanAt: sql`now()` })
        .where(eq(slackWorkspaces.id, ws.id));
    } catch (err) {
      summary.errors.push({ where: `workspace:${ws.workspaceName}`, error: stringifyErr(err) });
    }
  }

  await db
    .update(scanRuns)
    .set({
      completedAt: sql`now()`,
      workspacesScanned: summary.workspacesScanned,
      channelsScanned: summary.channelsScanned,
      messagesSeen: summary.messagesSeen,
      messagesFlagged: summary.messagesFlagged,
      errors: summary.errors,
    })
    .where(eq(scanRuns.id, run.id));

  return summary;
}

async function scanWorkspace(
  ws: SlackWorkspace,
  cutoffTs: string,
  excludePatterns: string[],
  summary: ScanSummary,
): Promise<void> {
  const slack = clientForToken(ws.userToken);

  // List channels Deniz has joined (public + private)
  const channels: Array<{ id: string; name: string; isPrivate: boolean }> = [];
  let cursor: string | undefined = undefined;
  do {
    const r = await slack.conversations.list({
      types: "public_channel,private_channel",
      exclude_archived: true,
      limit: 200,
      cursor,
    });
    for (const c of r.channels ?? []) {
      if (!c.id || !c.name) continue;
      if (!c.is_member) continue; // user token only sees history if joined
      channels.push({ id: c.id, name: c.name, isPrivate: !!c.is_private });
    }
    cursor = r.response_metadata?.next_cursor || undefined;
  } while (cursor);

  // User cache for the workspace (so we don't slam users.info)
  const userCache = new Map<string, { name: string; avatar: string | null }>();
  async function resolveUser(userId: string): Promise<{ name: string; avatar: string | null }> {
    const hit = userCache.get(userId);
    if (hit) return hit;
    try {
      const r = await slack.users.info({ user: userId });
      const profile = r.user?.profile;
      const name =
        (profile?.display_name as string | undefined) ||
        (r.user?.real_name as string | undefined) ||
        (r.user?.name as string | undefined) ||
        userId;
      const avatar = (profile?.image_72 as string | undefined) || null;
      const v = { name, avatar };
      userCache.set(userId, v);
      return v;
    } catch {
      const v = { name: userId, avatar: null };
      userCache.set(userId, v);
      return v;
    }
  }

  for (const ch of channels) {
    const lowered = ch.name.toLowerCase();
    if (excludePatterns.some((p) => lowered.includes(p))) continue;
    summary.channelsScanned++;

    let history: Awaited<ReturnType<typeof slack.conversations.history>>;
    try {
      history = await slack.conversations.history({
        channel: ch.id,
        oldest: cutoffTs,
        limit: 200,
      });
    } catch (err) {
      summary.errors.push({ where: `history:${ws.workspaceName}/${ch.name}`, error: stringifyErr(err) });
      continue;
    }

    const messages = (history.messages ?? []).slice().reverse(); // oldest -> newest for context
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      summary.messagesSeen++;
      if (!m.ts || !m.user || !m.text) continue;
      if (m.subtype) continue; // skip joins/leaves/bot messages
      if (m.user === ws.slackUserId) continue; // skip Deniz himself
      if (m.bot_id) continue;

      // Already flagged? Use unique constraint as the dedup; check first to skip LLM cost.
      const existing = await db
        .select({ id: flaggedMessages.id })
        .from(flaggedMessages)
        .where(
          sql`${flaggedMessages.workspaceId} = ${ws.workspaceId} and ${flaggedMessages.channelId} = ${ch.id} and ${flaggedMessages.messageTs} = ${m.ts}`,
        )
        .limit(1);
      if (existing.length > 0) continue;

      // Keyword pre-filter
      const km = matchKeywords(m.text);
      if (!passesPreFilter(km)) continue;

      // Build small context window (3 prior messages)
      const contextRaw = messages.slice(Math.max(0, i - 3), i);
      const contextResolved: Array<{ user: string; text: string; ts: string }> = [];
      for (const c of contextRaw) {
        if (!c.user || !c.text || !c.ts) continue;
        const u = await resolveUser(c.user);
        contextResolved.push({ user: u.name, text: c.text, ts: c.ts });
      }

      // LLM relevance
      let score: number;
      let reasoning: string;
      try {
        const r = await scoreRelevance(m.text, contextResolved);
        score = r.score;
        reasoning = r.reasoning;
      } catch (err) {
        summary.errors.push({ where: `relevance:${ws.workspaceName}/${ch.name}`, error: stringifyErr(err) });
        continue;
      }
      if (score < RELEVANCE_THRESHOLD) continue;

      // Draft
      let draft: string;
      try {
        draft = await draftResponse({ messageText: m.text, context: contextResolved });
      } catch (err) {
        summary.errors.push({ where: `draft:${ws.workspaceName}/${ch.name}`, error: stringifyErr(err) });
        continue;
      }

      // Author info + permalink
      const author = await resolveUser(m.user);
      let permalink: string | null = null;
      try {
        const p = await slack.chat.getPermalink({ channel: ch.id, message_ts: m.ts });
        permalink = (p.permalink as string | undefined) ?? null;
      } catch {
        permalink = null;
      }

      try {
        await db
          .insert(flaggedMessages)
          .values({
            workspaceId: ws.workspaceId,
            workspaceName: ws.workspaceName,
            channelId: ch.id,
            channelName: ch.name,
            messageTs: m.ts,
            threadTs: (m.thread_ts as string | undefined) ?? null,
            permalink,
            authorUserId: m.user,
            authorDisplayName: author.name,
            authorAvatarUrl: author.avatar,
            messageText: m.text,
            contextJson: contextResolved,
            matchedKeywords: km.matched,
            relevanceScore: score,
            relevanceReasoning: reasoning,
            draftResponse: draft,
            status: "pending",
          })
          .onConflictDoNothing();
        summary.messagesFlagged++;
      } catch (err) {
        summary.errors.push({ where: `insert:${ws.workspaceName}/${ch.name}`, error: stringifyErr(err) });
      }
    }
  }
}

function stringifyErr(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
