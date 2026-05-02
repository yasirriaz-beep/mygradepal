import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

function isPublicAppPath(pathname: string): boolean {
  if (pathname === "/") return true;
  const publicPrefixes = [
    "/login",
    "/pricing",
    "/referral",
    "/subjects",
    "/auth",
    "/parent/login",
    "/terms",
  ];
  return publicPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next/static") ||
    pathname.startsWith("/_next/image") ||
    pathname === "/favicon.ico" ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico|pdf)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Admin routes (cookie-based gate, unchanged behaviour)
  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login" || pathname.startsWith("/api/admin/auth")) {
      return NextResponse.next();
    }
    const session = request.cookies.get("admin_session");
    if (session?.value === "authenticated") return NextResponse.next();
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // Logged-out users may only access public marketing / auth confirmation / login flows
  if (isPublicAppPath(pathname)) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        supabaseResponse = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) =>
          supabaseResponse.headers.set(key, value),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    const nextPath = pathname + request.nextUrl.search;
    loginUrl.searchParams.set("next", nextPath || "/dashboard");
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
