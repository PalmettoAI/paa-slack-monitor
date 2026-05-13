import { NextResponse } from "next/server";
import { createHmac, randomBytes } from "node:crypto";
import { env } from "@/lib/env";
import { buildInstallUrl } from "@/lib/slack";

export const dynamic = "force-dynamic";

// Single-use state token: random || hmac(secret, random). Verified on callback.
function makeState(): string {
  const r = randomBytes(16).toString("hex");
  const h = createHmac("sha256", env.sessionSecret()).update(r).digest("hex").slice(0, 16);
  return `${r}.${h}`;
}

export async function GET() {
  const url = buildInstallUrl({
    clientId: env.slack.clientId(),
    redirectUri: `${env.publicBaseUrl()}/api/slack/callback`,
    state: makeState(),
  });
  return NextResponse.redirect(url);
}
