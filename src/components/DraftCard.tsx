"use client";

import { useState } from "react";

type Props = {
  id: number;
  workspaceName: string;
  channelName: string;
  authorDisplayName: string | null;
  authorAvatarUrl: string | null;
  messageText: string;
  draftResponse: string;
  permalink: string | null;
  flaggedAt: string;
  relevanceScore: number | null;
  matchedKeywords: string[];
};

export default function DraftCard(props: Props) {
  const [draft, setDraft] = useState(props.draftResponse);
  const [busy, setBusy] = useState<null | "save" | "sent" | "skip" | "copy">(null);
  const [hidden, setHidden] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (hidden) return null;

  const dirty = draft !== props.draftResponse;

  async function copyToClipboard() {
    setBusy("copy");
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setErr("Clipboard blocked. Select the text and copy manually.");
    } finally {
      setBusy(null);
    }
  }

  async function saveDraft() {
    setBusy("save");
    setErr(null);
    try {
      const r = await fetch(`/api/messages/${props.id}/draft`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftResponse: draft }),
      });
      if (!r.ok) throw new Error(`save failed: ${r.status}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function markSent() {
    setBusy("sent");
    setErr(null);
    try {
      const r = await fetch(`/api/messages/${props.id}/sent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalText: draft }),
      });
      if (!r.ok) throw new Error(`mark-sent failed: ${r.status}`);
      setHidden(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(null);
    }
  }

  async function skip() {
    setBusy("skip");
    setErr(null);
    try {
      const r = await fetch(`/api/messages/${props.id}/skip`, { method: "POST" });
      if (!r.ok) throw new Error(`skip failed: ${r.status}`);
      setHidden(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(null);
    }
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          {props.authorAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={props.authorAvatarUrl}
              alt=""
              className="h-9 w-9 rounded-md border border-ink/10"
            />
          ) : (
            <div className="h-9 w-9 rounded-md bg-ink/10 grid place-items-center text-xs font-medium text-muted">
              {(props.authorDisplayName || "?").slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div className="font-medium text-sm">{props.authorDisplayName ?? "unknown"}</div>
            <div className="text-[11px] text-muted">
              <span className="font-mono">{props.workspaceName}</span> · #{props.channelName}
              {props.relevanceScore !== null && (
                <>
                  {" · "}
                  <span className="text-accent">score {props.relevanceScore.toFixed(1)}</span>
                </>
              )}
            </div>
          </div>
        </div>
        {props.permalink && (
          <a
            href={props.permalink}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-muted hover:underline"
          >
            open in Slack ↗
          </a>
        )}
      </div>

      <div className="mb-3">
        <div className="label mb-1">Original message</div>
        <div className="text-sm whitespace-pre-wrap rounded-md bg-paper border border-ink/10 px-3 py-2">
          {props.messageText}
        </div>
        {props.matchedKeywords.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {props.matchedKeywords.slice(0, 6).map((k) => (
              <span key={k} className="chip-muted">
                {k}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mb-3">
        <div className="label mb-1">Drafted response (editable)</div>
        <textarea
          className="textarea min-h-[120px]"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
      </div>

      {err && <div className="mb-3 text-xs text-danger">{err}</div>}

      <div className="flex flex-wrap gap-2">
        <button onClick={copyToClipboard} disabled={!!busy} className="btn-primary">
          {copied ? "Copied ✓" : "Copy Response"}
        </button>
        <button onClick={markSent} disabled={!!busy} className="btn">
          {busy === "sent" ? "Saving…" : "Mark as Sent"}
        </button>
        {dirty && (
          <button onClick={saveDraft} disabled={!!busy} className="btn">
            {busy === "save" ? "Saving…" : "Save edits"}
          </button>
        )}
        <button onClick={skip} disabled={!!busy} className="btn-danger ml-auto">
          {busy === "skip" ? "…" : "Skip"}
        </button>
      </div>
    </div>
  );
}
