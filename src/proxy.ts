import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Grobschutz: leitet Nichtangemeldete zur Anmeldung um.
 *
 * Geprueft wird hier bewusst nur, ob ein Sitzungscookie vorhanden ist. Diese
 * optimistische Vorpruefung bleibt schnell; die verbindliche Pruefung des JWT
 * und der Benutzerrechte passiert in Server Actions und Route Handlern ueber
 * verlangeSitzung() beziehungsweise auth().
 */
const OEFFENTLICH = ["/login", "/api/auth"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (OEFFENTLICH.some((pfad) => pathname.startsWith(pfad))) {
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
