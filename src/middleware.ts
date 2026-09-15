import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const session = request.cookies.get("avi_session")?.value;
  const path = request.nextUrl.pathname;
  const protectedPath =
    path.startsWith("/tableau-de-bord") ||
    path.startsWith("/demandes") ||
    path.startsWith("/notifications") ||
    path.startsWith("/bureau") ||
    path.startsWith("/partenaire") ||
    path.startsWith("/delegue") ||
    path.startsWith("/delegations") ||
    path.startsWith("/vols") ||
    path.startsWith("/compte");

  if (protectedPath && !session) {
    return NextResponse.redirect(new URL("/connexion", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/tableau-de-bord/:path*",
    "/demandes/:path*",
    "/notifications/:path*",
    "/bureau/:path*",
    "/vols/:path*",
    "/partenaire",
    "/partenaire/:path*",
    "/delegue",
    "/delegue/:path*",
    "/delegations",
    "/delegations/:path*",
    "/compte",
    "/compte/:path*",
  ],
};
