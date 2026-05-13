import { NextResponse, type NextRequest } from "next/server";
import { verifySessionFromCookieHeader } from "@/lib/auth-edge";

const PUBLIC_PREFIXES = [
  "/login",
  "/api/health",
  "/api/cron", // bearer-auth'd
  "/api/slack/install",
  "/api/slack/callback",
  "/_next",
  "/favicon",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (pathname === "/login") return NextResponse.next();

  const cookieHeader = req.headers.get("cookie");
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  const ok = await verifySessionFromCookieHeader(cookieHeader, secret);
  if (!ok) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
