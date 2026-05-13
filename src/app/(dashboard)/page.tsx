import { listPendingMessages, getStats } from "@/lib/queries";
import DraftCard from "@/components/DraftCard";

export const dynamic = "force-dynamic";

function fmtAge(d: Date | null): string {
  if (!d) return "never";
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function QueuePage() {
  const [rows, stats] = await Promise.all([listPendingMessages(), getStats()]);
  return (
    <div>
      <header className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Response Queue</h1>
          <p className="text-sm text-muted mt-1">
            Drafts ready to review. Edit, copy, send in Slack, then mark as sent.
          </p>
        </div>
        <div className="text-xs text-muted">last scan {fmtAge(stats.lastScanAt as Date | null)}</div>
      </header>

      <section className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Flagged this week" value={stats.flaggedThisWeek} />
        <Stat label="Sent this week" value={stats.sentThisWeek} />
        <Stat label="Active threads" value={stats.activeThreads} />
        <Stat label="Top keyword" value={stats.topKeyword ?? "—"} mono />
      </section>

      {stats.workspaces === 0 && (
        <div className="card mb-6 border-warn/40 bg-warn/5">
          <div className="font-medium text-sm">No Slack workspaces connected yet.</div>
          <div className="text-xs text-muted mt-1">
            Go to <a className="underline" href="/workspaces">Workspaces</a> and click Connect.
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="card text-sm text-muted">No drafts pending. Quiet day in the channels.</div>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <DraftCard
              key={r.id}
              id={r.id}
              workspaceName={r.workspaceName}
              channelName={r.channelName}
              authorDisplayName={r.authorDisplayName}
              authorAvatarUrl={r.authorAvatarUrl}
              messageText={r.messageText}
              draftResponse={r.draftResponse}
              permalink={r.permalink}
              flaggedAt={String(r.flaggedAt)}
              relevanceScore={r.relevanceScore}
              matchedKeywords={r.matchedKeywords}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, mono }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div className="card py-3">
      <div className="label">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${mono ? "font-mono text-base" : ""}`}>
        {value}
      </div>
    </div>
  );
}
