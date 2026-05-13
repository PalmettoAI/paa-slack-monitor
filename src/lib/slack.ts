import { WebClient } from "@slack/web-api";

const REQUESTED_USER_SCOPES = [
  "channels:history",
  "channels:read",
  "groups:history",
  "groups:read",
  "users:read",
  "users.profile:read",
];

export function userScopes(): string[] {
  return REQUESTED_USER_SCOPES;
}

export function buildInstallUrl(opts: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const u = new URL("https://slack.com/oauth/v2/authorize");
  u.searchParams.set("client_id", opts.clientId);
  u.searchParams.set("user_scope", REQUESTED_USER_SCOPES.join(","));
  u.searchParams.set("scope", ""); // bot scopes — none, this is a user-token-only install
  u.searchParams.set("redirect_uri", opts.redirectUri);
  u.searchParams.set("state", opts.state);
  return u.toString();
}

export type OAuthV2Result = {
  ok: boolean;
  team: { id: string; name: string };
  authed_user: {
    id: string;
    scope: string;
    access_token: string; // xoxp-...
    token_type: "user";
  };
  error?: string;
};

export async function exchangeOAuthCode(opts: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}): Promise<OAuthV2Result> {
  const body = new URLSearchParams({
    client_id: opts.clientId,
    client_secret: opts.clientSecret,
    code: opts.code,
    redirect_uri: opts.redirectUri,
  });
  const r = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  return (await r.json()) as OAuthV2Result;
}

export function clientForToken(token: string): WebClient {
  return new WebClient(token);
}
