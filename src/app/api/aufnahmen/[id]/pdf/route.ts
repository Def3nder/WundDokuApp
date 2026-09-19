import { auth } from "@/lib/auth";
import { protokolliere } from "@/lib/audit";
import { erzeugeAufnahmePdf, PdfExportFehler } from "@/lib/pdf/export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sitzung = await auth();
  if (!sitzung?.user?.id) return new Response("Nicht angemeldet", { status: 401 });

  const { id } = await params;
  try {
    const { bytes, dateiname } = await erzeugeAufnahmePdf(id);
    await protokolliere(sitzung.user.id, "Assessment", id, "PDF_EXPORT");
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(bytes.length),
        "Content-Disposition": `attachment; filename="${dateiname}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (fehler) {
    if (fehler instanceof PdfExportFehler) {
      return new Response(fehler.message, { status: 404 });
    }
    console.error("PDF-Export fehlgeschlagen:", fehler);
    return new Response("PDF-Export fehlgeschlagen", { status: 500 });
  }
}
