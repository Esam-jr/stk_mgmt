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

  // Role-based route protection
  if (pathname.startsWith("/super-admin") && role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (pathname.startsWith("/main-admin") && role !== "MAIN_ADMIN") {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (pathname.startsWith("/sales") && role !== "SALES") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
