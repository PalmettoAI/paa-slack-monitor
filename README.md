# paa-slack-monitor

Slack community monitor + draft replies for Palmetto AI Automation. Lurks in SC entrepreneur Slack workspaces using a Slack user token, flags messages PAA can genuinely help with, drafts a response with Claude, and presents them in a dashboard for Deniz to review and copy-paste.

## Stack
- Next.js 14 (App Router, standalone output)
- TypeScript + Drizzle ORM + Postgres
- Tailwind CSS
- `@slack/web-api` for Slack reads
- `@anthropic-ai/sdk` — Haiku 4.5 for relevance scoring, Sonnet 4.6 for drafting
- Deployed on Railway, mirrors the `paa-prospector` patterns

## How the loop works
1. Cron hits `/api/cron/scan` every 3 hours.
2. For each connected workspace, scan public + private channels Deniz has joined.
3. Pull last 7 days of messages, skip Deniz's own / bot / subtype messages.
4. Skip messages already in `flagged_messages`.
5. Skip channels matching `SLACK_EXCLUDE_CHANNELS` substrings.
6. Keyword pre-filter (groups: SEO/web, automation, pain signal). Require 2+ groups OR a strong-signal phrase.
7. Score 0-10 with Haiku 4.5. Drop anything <6.
8. Draft a response with Sonnet 4.6 using the Slack tone rules.
9. Insert into `flagged_messages` with status `pending`.
10. Deniz opens the dashboard, edits, clicks Copy, pastes into Slack, clicks Mark as Sent.
11. Mark-as-Sent inserts a `monitored_threads` row. `/api/cron/thread-watch` polls each tracked thread for new replies.

## First-time setup

### 1. Create the Slack app's OAuth Redirect URL
In `api.slack.com/apps` → A0B49GEKJMN → "OAuth & Permissions":
- Add Redirect URL: `${PUBLIC_BASE_URL}/api/slack/callback`
- Add User Token Scopes: `channels:history`, `channels:read`, `groups:history`, `groups:read`, `users:read`, `users.profile:read`
- (No bot scopes needed.)

### 2. Set env vars
See [`NEW_ENV_VARS.md`](./NEW_ENV_VARS.md). At minimum: `DATABASE_URL`, `DASHBOARD_PASSWORD`, `SESSION_SECRET`, `CRON_SECRET`, `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `PUBLIC_BASE_URL`, `ANTHROPIC_API_KEY`.

### 3. Migrate
```bash
npm install
npm run db:generate    # only if schema changed
npm run db:migrate
```

### 4. Install into a workspace
- Open the dashboard → Workspaces → Connect a workspace
- Pick the Slack workspace, approve the user-token scopes
- Returns to /workspaces with the install confirmation
- Repeat for each community

### 5. Trigger a manual scan
```bash
curl -H "Authorization: Bearer $CRON_SECRET" "$PUBLIC_BASE_URL/api/cron/scan"
```

### 6. Wire up Railway cron
Two cron services on the same Railway project, both using the same Docker image and `DATABASE_URL`:
- `paa-slack-monitor-scan` — schedule `0 */3 * * *`, startCommand: `node server.js & sleep 5; curl -fsS -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/scan; kill %1`
- `paa-slack-monitor-thread-watch` — schedule `*/30 * * * *`, similar pattern hitting `/api/cron/thread-watch`

(Or run the cron from the web service itself by hitting the public URL externally — the scan endpoint is bearer-auth'd.)

Per the Railway secret-in-startCommand convention used elsewhere in PAA: bake the literal `CRON_SECRET` into the cron's startCommand so the variable can't drift between web + cron.

## Profile setup
See [`SLACK_PROFILE_GUIDE.md`](./SLACK_PROFILE_GUIDE.md) for the per-community profile + intro post + behavior rules.

## Local dev
```bash
cp .env.example .env
# edit .env
npm install
npm run db:migrate
npm run dev
# http://localhost:3000
```

## Notes
- The `xapp-1-...` app-level token is **not** used by this app. App-level tokens can't read history. The scanner uses per-workspace `xoxp-...` user tokens stored in the `slack_workspaces` table after OAuth install.
- Single-user app — `DASHBOARD_PASSWORD` only.
- Robots blocked at the layout level; do not expose this dashboard publicly.
