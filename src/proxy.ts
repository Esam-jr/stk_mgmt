import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes — no auth needed
  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const role = (session.user as { role?: string }).role;
  const isSuperAdmin = role === "SUPER_ADMIN";
  const isMainAdmin = role === "MAIN_ADMIN";
  const isSales = role === "SALES";

  // Role-based route protection
  if (pathname.startsWith("/super-admin") && !isSuperAdmin) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  // Keep SUPER_ADMIN in a single canonical namespace for better UX.
  if (pathname.startsWith("/main-admin") && isSuperAdmin) {
    const redirectedPath = pathname.replace("/main-admin", "/super-admin");
    return NextResponse.redirect(new URL(redirectedPath, request.url));
  }
  if (pathname.startsWith("/main-admin") && !isMainAdmin) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (pathname.startsWith("/sales") && !isSales) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
