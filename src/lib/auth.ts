import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";

// Kostenstufe 12: spuerbar beim Anmelden, aber unbedeutend bei der Handvoll
// Anmeldungen pro Tag - und teuer genug gegen Offline-Angriffe.
const BCRYPT_RUNDEN = 12;

export function hashePasswort(passwort: string): Promise<string> {
  return bcrypt.hash(passwort, BCRYPT_RUNDEN);
}

const anmeldeSchema = z.object({
  email: z.string().email(),
  passwort: z.string().min(1),
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      rolle: string;
      handzeichen: string;
    } & DefaultSession["user"];
  }
  interface User {
    rolle: string;
    handzeichen: string;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-Mail", type: "email" },
        passwort: { label: "Passwort", type: "password" },
      },
      async authorize(credentials) {
        const geprueft = anmeldeSchema.safeParse(credentials);
        if (!geprueft.success) return null;

        const benutzer = await db.user.findUnique({
          where: { email: geprueft.data.email.toLowerCase() },
        });

        // Auch ohne Treffer einmal hashen, damit die Antwortzeit nicht
        // verraet, ob die E-Mail existiert.
        const hash = benutzer?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin";
        const passt = await bcrypt.compare(geprueft.data.passwort, hash);

        if (!benutzer || !benutzer.aktiv || !passt) return null;

        await db.auditLog.create({
          data: { userId: benutzer.id, entitaet: "User", entitaetId: benutzer.id, aktion: "ANMELDEN" },
        });

        return {
          id: benutzer.id,
          email: benutzer.email,
          name: benutzer.name,
          rolle: benutzer.rolle,
          handzeichen: benutzer.handzeichen,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.rolle = user.rolle;
        token.handzeichen = user.handzeichen;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.rolle = token.rolle as string;
      session.user.handzeichen = token.handzeichen as string;
      return session;
    },
  },
});

/**
 * Sitzung fuer Server Actions und Routen.
 *
 * Jede schreibende Stelle ruft das selbst auf - die Middleware allein zu
 * vertrauen waere zu wenig, weil Server Actions auch direkt aufrufbar sind.
 */
export async function verlangeSitzung() {
  const sitzung = await auth();
  if (!sitzung?.user?.id) throw new Error("Nicht angemeldet");
  return sitzung;
}

export async function verlangeAdmin() {
  const sitzung = await verlangeSitzung();
  if (sitzung.user.rolle !== "ADMIN") throw new Error("Keine Berechtigung");
  return sitzung;
}
