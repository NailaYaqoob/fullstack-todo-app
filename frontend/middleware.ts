import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  // Check for Better Auth session cookie (name may vary by version)
  const sessionCookie =
    request.cookies.get("better-auth.session_token") ??
    request.cookies.get("__session") ??
    request.cookies.get("session");

  if (!sessionCookie?.value) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
