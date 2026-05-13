import { NextResponse, type NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { exchangeOAuthCode, clientForToken } from "@/lib/slack";
import { db, slackWorkspaces } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

function verifyState(state: string | null): boolean {
  if (!state) return false;
  const dot = state.lastIndexOf(".");
  if (dot < 0) return false;
  const r = state.slice(0, dot);
  const sig = state.slice(dot + 1);
  const expected = createHmac("sha256", env.sessionSecret()).update(r).digest("hex").slice(0, 16);
  if (sig.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const slackError = req.nextUrl.searchParams.get("error");

  if (slackError) {
    return NextResponse.redirect(`${env.publicBaseUrl()}/workspaces?error=${encodeURIComponent(slackError)}`);
  }
  if (!code || !verifyState(state)) {
    return NextResponse.redirect(`${env.publicBaseUrl()}/workspaces?error=invalid_state`);
  }

  const result = await exchangeOAuthCode({
    clientId: env.slack.clientId(),
    clientSecret: env.slack.clientSecret(),
    code,
    redirectUri: `${env.publicBaseUrl()}/api/slack/callback`,
  });

  if (!result.ok || !result.authed_user?.access_token) {
    return NextResponse.redirect(
      `${env.publicBaseUrl()}/workspaces?error=${encodeURIComponent(result.error ?? "oauth_failed")}`,
    );
  }

  const userToken = result.authed_user.access_token;
  const slackUserId = result.authed_user.id;
  const workspaceId = result.team.id;
  const workspaceName = result.team.name;

  // Resolve user display name for nicer UI
  let displayName: string | null = null;
  try {
    const w = clientForToken(userToken);
    const info = await w.users.info({ user: slackUserId });
    displayName =
      (info.user?.profile?.display_name as string | undefined) ||
      (info.user?.real_name as string | undefined) ||
      null;
  } catch (err) {
    console.warn("[slack-callback] users.info failed:", err);
  }

  // Upsert
  await db
    .insert(slackWorkspaces)
    .values({
      workspaceId,
      workspaceName,
      userToken,
      slackUserId,
      slackUserName: displayName,
      active: true,
    })
    .onConflictDoUpdate({
      target: slackWorkspaces.workspaceId,
      set: {
        workspaceName,
        userToken,
        slackUserId,
        slackUserName: displayName,
        active: true,
        installedAt: sql`now()`,
      },
    });

  return NextResponse.redirect(`${env.publicBaseUrl()}/workspaces?installed=${encodeURIComponent(workspaceName)}`);
}
