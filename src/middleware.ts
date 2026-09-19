import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Grobschutz: leitet Nichtangemeldete zur Anmeldung um.
 *
 * Geprueft wird nur, ob ein Sitzungscookie vorhanden ist - die Middleware
 * laeuft in der Edge-Runtime und kann das JWT ohne Node-Krypto nicht pruefen.
 * Die eigentliche Pruefung passiert in jeder Server Action und jeder Route
 * ueber verlangeSitzung().
 */
const OEFFENTLICH = ["/login", "/api/auth"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (OEFFENTLICH.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const hatCookie =
    request.cookies.has("authjs.session-token") ||
    request.cookies.has("__Secure-authjs.session-token");

  if (!hatCookie) {
    const ziel = new URL("/login", request.url);
    // Nach der Anmeldung dorthin zurueck, wo der Nutzer hinwollte.
    if (pathname !== "/") ziel.searchParams.set("weiter", pathname);
    return NextResponse.redirect(ziel);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|webp)$).*)"],
};
