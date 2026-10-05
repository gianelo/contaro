import { auth } from "@/auth";
import { database } from "@/db/client";
import { readClosedMonthReport } from "@/db/month-reports";
import { findSpaceForMember } from "@/db/spaces";
import { handleReadMonthReport } from "./read";
/** The future PDF route calls this on every request, never a retained artifact. */
export async function loadMonthReport(spaceId: string, month: string) {
  return handleReadMonthReport({
    readSession: async () => {
      const session = await auth();
      return session ? { memberId: session.user.id } : null;
    },
    findSpace: (id, memberId) => findSpaceForMember(database(), id, memberId),
    readReport: (space, of) => readClosedMonthReport(database(), space, of),
  }, spaceId, month);
}
