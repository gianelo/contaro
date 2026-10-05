import { t } from "@/i18n";
import { renderMonthPdf } from "@/reports/month-pdf";
import { handleReadMonthReport, type ReportPorts } from "./read";

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "Pragma": "no-cache",
  "Expires": "0",
  "Vary": "Cookie",
  "X-Content-Type-Options": "nosniff",
};

/** Every download crosses the same authorization seam and renders anew. */
export async function downloadMonthReport(
  ports: ReportPorts,
  spaceId: string,
  asked: string,
  generatedAt = new Date(),
): Promise<Response> {
  const outcome = await handleReadMonthReport(ports, spaceId, asked);
  switch (outcome.kind) {
    case "not-signed-in": return refusal(401, t("report.error.session"));
    case "no-such-space": return refusal(404, t("report.error.space"));
    case "no-such-month": return refusal(400, t("report.error.month"));
    case "month-open": return refusal(409, t("report.error.open"));
    case "failed": return refusal(500, t("report.error"));
    case "ready":
      try {
        const pdf = await renderMonthPdf(outcome.report, generatedAt);
        return new Response(new Uint8Array(pdf), {
          headers: {
            ...privateHeaders,
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="contaro-${outcome.report.closed.month}.pdf"`,
          },
        });
      } catch {
        return refusal(500, t("report.error"));
      }
  }
}

function refusal(status: number, error: string) {
  return Response.json({ error }, { status, headers: privateHeaders });
}
