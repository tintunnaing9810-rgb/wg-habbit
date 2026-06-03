import { NextResponse, type NextRequest } from "next/server";

const protectedRoutes = ["/dashboard", "/habits", "/leaderboard", "/feed", "/stats"];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtected = protectedRoutes.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`),
  );

  if (!isProtected) return NextResponse.next();

  // Lightweight cookie check — real auth verified in server components via requireUser()
  const hasSession = request.cookies.getAll().some(
    (c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"),
  );

  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
