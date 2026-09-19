"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

export type AnmeldeZustand = {
  fehler?: string;
  /** Eingegebene E-Mail zurueckgeben, damit sie nach einem Fehler stehen bleibt. */
  email?: string;
};

export async function anmelden(
  _zustand: AnmeldeZustand,
  formData: FormData,
): Promise<AnmeldeZustand> {
  const email = String(formData.get("email") ?? "");
  const weiter = String(formData.get("weiter") ?? "");

  // Nur projektinterne Pfade zulassen - sonst waere das eine offene Weiterleitung.
  const ziel = weiter.startsWith("/") && !weiter.startsWith("//") ? weiter : "/";

  try {
    await signIn("credentials", {
      email,
      passwort: String(formData.get("passwort") ?? ""),
      redirectTo: ziel,
    });
    return {};
  } catch (fehler) {
    // signIn wirft bei Erfolg eine Weiterleitung - die muss durchgereicht werden.
    if (fehler instanceof AuthError) {
      return {
        email,
        fehler: "E-Mail oder Passwort ist nicht korrekt.",
      };
    }
    throw fehler;
  }
}
