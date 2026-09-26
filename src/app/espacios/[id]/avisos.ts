import type { Queries } from "@/db/connection";
import { findSpaceForMember } from "@/db/spaces";
import { invitationsWaitingFor } from "@/db/invitations";
import { countUnpaidFixedItemsInMonth } from "@/db/budget-items";
import { monthOf } from "@/domain/calendar/month";
import type { Space } from "@/domain/space/space";
import type { Reader } from "@/app/reader";
import { theWaitingMonth } from "./waiting";

/**
 * Passive Avisos read for an authenticated Member. The caller supplies the
 * authenticated identity and request Reader/headers; this boundary rechecks
 * membership even when handed a Space from a previously verified route.
 * A nonmember gets no account invitations through this Space-bound read.
 */
export async function readAvisos(
  db: Queries,
  memberId: string,
  space: Space,
  reader: Reader,
  headers: Headers,
) {
  const verified = await findSpaceForMember(db, space.id, memberId);
  if (!verified) return null;

  const [invitations, waitingMonth, unpaidFixedCount] = await Promise.all([
    invitationsWaitingFor(db, memberId),
    theWaitingMonth(db, memberId, verified.id, reader, headers),
    countUnpaidFixedItemsInMonth(db, verified, monthOf(reader.today)),
  ]);
  return { invitations, waitingMonth, unpaidFixedCount };
}
