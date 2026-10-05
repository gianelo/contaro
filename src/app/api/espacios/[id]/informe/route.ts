import { monthReportPorts } from "@/app/espacios/[id]/informe/load";
import { downloadMonthReport } from "@/app/espacios/[id]/informe/download";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const month = new URL(request.url).searchParams.get("mes") ?? "";
  return downloadMonthReport(monthReportPorts, id, month);
}
