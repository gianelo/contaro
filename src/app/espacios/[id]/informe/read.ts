import type { ReadSession } from "@/auth/session";
import { isMonth, type Month } from "@/domain/calendar/month";
import type { SpaceMember } from "@/domain/space/access";
import type { MonthReport } from "@/domain/space/report";
import type { Space } from "@/domain/space/space";

export type ReportWithMembers = MonthReport & {
  members: readonly SpaceMember[];
};

export type ReportPorts = {
  readSession: ReadSession;
  findSpace: (spaceId: string, memberId: string) => Promise<Space | null>;
  readReport: (space: Space, of: Month) => Promise<ReportWithMembers | null>;
};

export type ReportOutcome =
  | { kind: "ready"; report: ReportWithMembers }
  | { kind: "not-signed-in" }
  | { kind: "no-such-space" }
  | { kind: "no-such-month" }
  | { kind: "month-open" }
  | { kind: "failed"; cause: unknown };

/** Each request reads again; no cached file, creator restriction or close side effect. */
export async function handleReadMonthReport(
  ports: ReportPorts,
  spaceId: string,
  asked: string,
): Promise<ReportOutcome> {
  try {
    const session = await ports.readSession();
    if (session === null) return { kind: "not-signed-in" };
    if (!isMonth(asked)) return { kind: "no-such-month" };

    const space = await ports.findSpace(spaceId, session.memberId);
    if (space === null) return { kind: "no-such-space" };

    const report = await ports.readReport(space, asked);
    return report ? { kind: "ready", report } : { kind: "month-open" };
  } catch (cause) {
    return { kind: "failed", cause };
  }
}
