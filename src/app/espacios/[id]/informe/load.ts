import { auth } from "@/auth";
import { database } from "@/db/client";
import { readClosedMonthReport } from "@/db/month-reports";
import { findSpaceForMember } from "@/db/spaces";
import { handleReadMonthReport, type ReportPorts } from "./read";

export const monthReportPorts: ReportPorts = {
    readSession: async () => {
      const session = await auth();
      return session ? { memberId: session.user.id } : null;
    },
    findSpace: (id, memberId) => findSpaceForMember(database(), id, memberId),
    readReport: (space, of) => readClosedMonthReport(database(), space, of),
};

/** Re-read the authorized closed month, never a retained artifact. */
export async function loadMonthReport(spaceId: string, month: string) {
  return handleReadMonthReport(monthReportPorts, spaceId, month);
}
