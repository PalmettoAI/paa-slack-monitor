import { listActiveThreads } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ThreadsPage() {
  const rows = await listActiveThreads();
  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Active Threads</h1>
        <p className="text-sm text-muted mt-1">
          Conversations Deniz already replied to that have new activity worth checking.
        </p>
      </header>
      {rows.length === 0 ? (
        <div className="card text-sm text-muted">No new replies right now.</div>
      ) : (
        <div className="space-y-4">
          {rows.map((t) => (
            <div key={t.id} className="card">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <div className="text-sm font-medium">
                    New reply from <span className="font-mono">{t.lastReplyUser ?? "someone"}</span>
                  </div>
                  <div className="text-[11px] text-muted">
                    workspace <span className="font-mono">{t.workspaceId}</span> · last checked{" "}
                    {new Date(t.lastCheckedAt).toLocaleString()}
                  </div>
                </div>
                {t.permalink && (
                  <a
                    href={t.permalink}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary text-xs"
                  >
                    View in Slack ↗
                  </a>
                )}
              </div>
              <div className="text-sm whitespace-pre-wrap rounded-md bg-paper border border-ink/10 px-3 py-2">
                {t.lastReplyText ?? "(no text)"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
