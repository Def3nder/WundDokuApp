import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

function anfrage(pfad: string, cookie?: string) {
  return new NextRequest(new URL(pfad, "http://localhost:3000"), {
    headers: cookie ? { cookie } : undefined,
  });
}

describe("Proxy-Zugriffsschutz", () => {
  it("laesst Login und Auth-Endpunkte ohne Sitzung passieren", () => {
    expect(proxy(anfrage("/login")).headers.get("x-middleware-next")).toBe("1");
    expect(proxy(anfrage("/api/auth/session")).headers.get("x-middleware-next")).toBe("1");
  });

  it("leitet geschuetzte Seiten mit Ruecksprungziel zum Login", () => {
    const antwort = proxy(anfrage("/wunden/w1"));

    expect(antwort.status).toBe(307);
    expect(antwort.headers.get("location")).toBe(
      "http://localhost:3000/login?weiter=%2Fwunden%2Fw1",
    );
  });

  it("leitet die Startseite ohne unnoetigen Ruecksprungparameter um", () => {
    expect(proxy(anfrage("/")).headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("laesst Anfragen mit normalem oder Secure-Sitzungscookie passieren", () => {
    expect(
      proxy(anfrage("/", "authjs.session-token=lokale-testsitzung")).headers.get(
        "x-middleware-next",
      ),
    ).toBe("1");
    expect(
      proxy(anfrage("/", "__Secure-authjs.session-token=lokale-testsitzung")).headers.get(
        "x-middleware-next",
      ),
    ).toBe("1");
  });
});
