import { readFile } from "node:fs/promises";
import { type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { absoluterDokumentPfad } from "@/lib/dokumente";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sitzung = await auth();
  if (!sitzung?.user?.id) return new Response("Nicht angemeldet", { status: 401 });
  const { id } = await params;
  const dokument = await db.patientDocument.findUnique({
    where: { id },
    include: { patient: { select: { geloeschtAm: true } } },
  });
  if (!dokument || dokument.geloeschtAm || dokument.patient.geloeschtAm) return new Response("Dokument nicht gefunden", { status: 404 });

  try {
    const daten = await readFile(absoluterDokumentPfad(dokument.pfad));
    const download = request.nextUrl.searchParams.get("download") === "1";
    const sichererName = dokument.dateiname.replace(/["\\\r\n]/g, "_");
    return new Response(daten, {
      headers: {
        "Content-Type": dokument.mimeType,
        "Content-Length": String(daten.length),
        "Cache-Control": "private, no-store",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${sichererName}"`,
      },
    });
  } catch {
    return new Response("Dokumentdatei nicht gefunden", { status: 404 });
  }
}
