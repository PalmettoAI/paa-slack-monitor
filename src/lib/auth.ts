import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env";

const COOKIE_NAME = "paasm_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function sign(payload: string): string {
  const h = createHmac("sha256", env.sessionSecret()).update(payload).digest("hex");
  return `${payload}.${h}`;
}

function verifySigned(value: string | undefined | null): string | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = createHmac("sha256", env.sessionSecret()).update(payload).digest("hex");
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  return payload;
}

export function buildSessionCookie() {
  const issued = Date.now().toString();
  return {
    name: COOKIE_NAME,
    value: sign(issued),
    maxAge: MAX_AGE_SECONDS,
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export function clearSessionCookie() {
  return {
    name: COOKIE_NAME,
    value: "",
    maxAge: 0,
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export function isAuthedFromCookieHeader(cookieHeader: string | null | undefined): boolean {
  if (!cookieHeader) return false;
  const match = cookieHeader.split(/;\s*/).find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!match) return false;
  const value = decodeURIComponent(match.slice(COOKIE_NAME.length + 1));
  return verifySigned(value) !== null;
}

export function checkPassword(submitted: string): boolean {
  const expected = env.dashboardPassword();
  if (!submitted || submitted.length !== expected.length) return false;
  const a = Buffer.from(submitted);
  const b = Buffer.from(expected);
  return timingSafeEqual(a, b);
}

export { COOKIE_NAME };
