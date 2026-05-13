import { listWorkspaces } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function WorkspacesPage({
  searchParams,
}: {
  searchParams: { installed?: string; error?: string };
}) {
  const rows = await listWorkspaces();
  return (
    <div>
      <header className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Workspaces</h1>
          <p className="text-sm text-muted mt-1">
            Each Slack community Deniz wants to monitor needs to be installed once.
          </p>
        </div>
        <a href="/api/slack/install" className="btn-primary">
          Connect a workspace
        </a>
      </header>

      {searchParams.installed && (
        <div className="card mb-4 border-accent/40 bg-accent/5 text-sm">
          Installed <span className="font-mono">{searchParams.installed}</span>. Scanner will pick
          it up on the next run.
        </div>
      )}
      {searchParams.error && (
        <div className="card mb-4 border-danger/40 bg-danger/5 text-sm">
          OAuth error: <span className="font-mono">{searchParams.error}</span>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="card text-sm text-muted">
          No workspaces connected. Click Connect to install in your first community.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((w) => (
            <div key={w.id} className="card flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{w.workspaceName}</div>
                <div className="text-[11px] text-muted">
                  workspace <span className="font-mono">{w.workspaceId}</span> · user{" "}
                  <span className="font-mono">{w.slackUserName ?? w.slackUserId}</span> · installed{" "}
                  {new Date(w.installedAt).toLocaleDateString()}
                  {w.lastScanAt && <> · last scan {new Date(w.lastScanAt).toLocaleString()}</>}
                </div>
              </div>
              <span className={w.active ? "chip-ok" : "chip-muted"}>
                {w.active ? "active" : "paused"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
