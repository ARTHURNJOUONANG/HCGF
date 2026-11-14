import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Filtre rapide : sans cookie de session, les espaces privés renvoient vers /connexion.
 * La session elle-même (signature, révocation, rôle) est vérifiée par chaque écran.
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.get("avi_session")?.value) {
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
    "/partenaire/:path*",
    "/delegue/:path*",
    "/delegations/:path*",
    "/compte/:path*",
  ],
};
