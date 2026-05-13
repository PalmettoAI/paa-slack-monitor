import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearSessionCookie } from "@/lib/auth";

export async function GET() {
  cookies().set(clearSessionCookie());
  return NextResponse.redirect(new URL("/login", process.env.PUBLIC_BASE_URL || "http://localhost:3000"));
}
