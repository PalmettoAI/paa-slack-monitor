import { db, sentResponses, flaggedMessages } from "@/db";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function SentPage() {
  const rows = await db
    .select({
      sent: sentResponses,
      msg: flaggedMessages,
    })
    .from(sentResponses)
    .innerJoin(flaggedMessages, eq(flaggedMessages.id, sentResponses.flaggedMessageId))
    .orderBy(desc(sentResponses.sentAt))
    .limit(100);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Sent</h1>
        <p className="text-sm text-muted mt-1">Last 100 responses you marked as sent.</p>
      </header>
      {rows.length === 0 ? (
        <div className="card text-sm text-muted">Nothing sent yet.</div>
      ) : (
        <div className="space-y-3">
          {rows.map(({ sent, msg }) => (
            <div key={sent.id} className="card">
              <div className="flex items-baseline justify-between mb-1">
                <div className="text-xs text-muted">
                  <span className="font-mono">{msg.workspaceName}</span> · #{msg.channelName} ·{" "}
                  {msg.authorDisplayName ?? "unknown"}
                </div>
                <div className="text-[11px] text-muted">
                  {new Date(sent.sentAt).toLocaleString()}
                </div>
              </div>
              <div className="text-xs text-muted line-clamp-2 mb-2">{msg.messageText}</div>
              <div className="text-sm whitespace-pre-wrap rounded-md bg-paper border border-ink/10 px-3 py-2">
                {sent.finalText}
              </div>
              {msg.permalink && (
                <a
                  href={msg.permalink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-muted hover:underline mt-2 inline-block"
                >
                  open in Slack ↗
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
