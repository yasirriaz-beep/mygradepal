import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only protect /admin routes
  if (!pathname.startsWith("/admin")) return NextResponse.next();

  // Allow login page through
  if (pathname === "/admin/login") return NextResponse.next();

  // Allow API admin auth route through
  if (pathname === "/api/admin/auth") return NextResponse.next();

  // Check for admin session cookie
  const session = req.cookies.get("admin_session");
  if (session?.value === "authenticated") return NextResponse.next();

  // Redirect to login
  return NextResponse.redirect(new URL("/admin/login", req.url));
}

export const config = {
  matcher: ["/admin/:path*"],
};
