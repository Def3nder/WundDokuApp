import { readFile } from "node:fs/promises";
import { type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { absoluterFotoPfad } from "@/lib/fotos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const sitzung = await auth();
  if (!sitzung?.user?.id) return new Response("Nicht angemeldet", { status: 401 });

  const { id } = await params;
  const foto = await db.photo.findUnique({
    where: { id },
    include: {
      aufnahme: {
        select: {
          geloeschtAm: true,
          wunde: { select: { geloeschtAm: true, patient: { select: { geloeschtAm: true } } } },
        },
      },
    },
  });
  if (
    !foto ||
    foto.geloeschtAm ||
    foto.aufnahme.geloeschtAm ||
    foto.aufnahme.wunde.geloeschtAm ||
    foto.aufnahme.wunde.patient.geloeschtAm
  ) {
    return new Response("Foto nicht gefunden", { status: 404 });
  }

  const thumbnail = request.nextUrl.searchParams.get("thumbnail") === "1";
  try {
    const daten = await readFile(absoluterFotoPfad(thumbnail ? foto.thumbnailPfad : foto.pfad));
    return new Response(daten, {
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(daten.length),
        "Cache-Control": "private, no-store",
        "Content-Disposition": `inline; filename="${thumbnail ? "wundfoto-thumbnail" : "wundfoto"}.webp"`,
      },
    });
  } catch {
    return new Response("Fotodatei nicht gefunden", { status: 404 });
  }
}
