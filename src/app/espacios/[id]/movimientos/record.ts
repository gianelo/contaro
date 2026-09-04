import type { ReadSession } from "@/auth/session";
import type { CalendarDate } from "@/domain/calendar/month";
import {
  UnrecordableMovementError,
  type Movement,
  type MovementAmendment,
  type MovementDraft,
  type Recorder,
} from "@/domain/movement/movement";
import type { Space } from "@/domain/space/space";
import { t } from "@/i18n";

/**
 * Everything these handlers need from the world outside them, as functions.
 *
 * The seam #7 is proven at. A session, a Space, a clock and a store arrive as
 * arguments, so the whole path — answers to Movement to refusal — is driven in
 * milliseconds with no server, no database and no Google account.
 */
export type MovementPorts = {
  readSession: ReadSession;
  findSpace: (spaceId: string, memberId: string) => Promise<Space | null>;
  /**
   * The day it is, by a clock nobody typing can move. The screen offers the
   * browser's today because that is the person's own day; what "not yet" means
   * is measured here, because a browser's clock is the browser's to set.
   */
  today: () => CalendarDate;
  save: (recorder: Recorder, draft: MovementDraft) => Promise<Movement>;
  amend: (
    recorder: Recorder,
    movementId: string,
    changes: MovementAmendment,
  ) => Promise<Movement | null>;
  strike: (
    spaceId: string,
    movementId: string,
    struckBy: string,
  ) => Promise<boolean>;
};

/** A Movement now says what the Member meant it to say. */
export type Recorded = { kind: "recorded"; movement: Movement };

/** A Movement no longer counts, and the row says who struck it. */
export type Struck = { kind: "struck" };

/**
 * Every way this can fail to happen, each one something a screen can act on.
 *
 * Apart from the two successes rather than one union with them, so that an
 * action which can only strike cannot be handed a Movement, and one which can
 * only record cannot be handed a strike — a mistake TypeScript would otherwise
 * find only when the redirect went to the wrong screen.
 */
export type Refusal =
  | { kind: "rejected"; field: UnrecordableMovementError["field"] }
  | { kind: "not-signed-in" }
  | { kind: "no-such-space" }
  | { kind: "no-such-movement" }
  | { kind: "failed"; cause: unknown };

/**
 * What the entry screen knows after a submission: nothing, or why it was
 * refused.
 *
 * Here rather than beside the action itself: a "use server" module may export
 * async functions and nothing else, so a state constant living next to the
 * action compiles and then fails at runtime on the first request.
 */
export type MovementFormState = { error: string | null };

export const nothingWrongYet: MovementFormState = { error: null };

/**
 * A signed-in Member's answers become a Movement inside a Space they are
 * really in, and everything else becomes a refusal a screen can act on.
 *
 * Membership is asked again here, on a Space the form named. The GET that
 * rendered the screen proved it, but a form field is a claim: without this,
 * the Space someone records into is the Space whose identifier they guessed.
 */
export async function handleRecordMovement(
  ports: MovementPorts,
  draft: MovementDraft,
): Promise<Recorded | Refusal> {
  return inSpace(ports, draft.spaceId, async (recorder) => ({
    kind: "recorded",
    movement: await ports.save(recorder, draft),
  }));
}

/** A correction to a Movement, held to every rule the recording was held to. */
export async function handleAmendMovement(
  ports: MovementPorts,
  spaceId: string,
  movementId: string,
  changes: MovementAmendment,
): Promise<Recorded | Refusal> {
  return inSpace(ports, spaceId, async (recorder) => {
    const amended = await ports.amend(recorder, movementId, changes);
    // Not found rather than forbidden: a Movement in a Space this Member is
    // not in must read the same as one that never existed.
    return amended
      ? { kind: "recorded", movement: amended }
      : { kind: "no-such-movement" };
  });
}

/**
 * A Movement struck out by a Member of its Space.
 *
 * Any Member may strike out any of the Space's Movements — inside a shared
 * Space the money is one pot — and who did it goes onto the row. Nothing is
 * deleted: a ledger that loses entries silently lies about every figure
 * downstream, which is the whole reason `recordedBy` exists in the first place.
 */
export async function handleStrikeMovement(
  ports: MovementPorts,
  spaceId: string,
  movementId: string,
): Promise<Struck | Refusal> {
  return inSpace(ports, spaceId, async (recorder) => {
    const struck = await ports.strike(spaceId, movementId, recorder.recordedBy);
    return struck ? { kind: "struck" } : { kind: "no-such-movement" };
  });
}

/**
 * The three things every one of the above does first: who is asking, whether
 * they are in this Space, and what day the clock says.
 *
 * Written once because it is one rule. Three copies of "prove the membership
 * before writing" is three places for one of them to stop proving it.
 */
async function inSpace<Done>(
  ports: MovementPorts,
  spaceId: string,
  act: (recorder: Recorder) => Promise<Done | Refusal>,
): Promise<Done | Refusal> {
  const session = await ports.readSession();

  if (session === null) {
    return { kind: "not-signed-in" };
  }

  try {
    const space = await ports.findSpace(spaceId, session.memberId);

    // Not found rather than forbidden, the way `currentSpace` refuses: saying
    // a Space exists but is not theirs is already saying something about it.
    if (space === null) {
      return { kind: "no-such-space" };
    }

    return await act({
      space,
      recordedBy: session.memberId,
      today: ports.today(),
    });
  } catch (error) {
    // A bad answer is the person's to fix and is named on the screen. Anything
    // else is ours, and saying "the amount is wrong" about a dropped
    // connection would send them to correct a field that was never the problem.
    if (error instanceof UnrecordableMovementError) {
      return { kind: "rejected", field: error.field };
    }
    return { kind: "failed", cause: error };
  }
}

/**
 * What a refused Movement says on the screen.
 *
 * Kept beside the outcomes it maps, so adding an outcome without deciding what
 * a person is told about it is a type error rather than a blank screen.
 */
export function refusalMessage(refusal: Refusal): string {
  switch (refusal.kind) {
    case "not-signed-in":
      return t("movements.error.signedOut");
    case "no-such-space":
      return t("movements.error.space");
    case "no-such-movement":
      return t("movements.error.gone");
    case "failed":
      return t("movements.error.failed");
    case "rejected":
      switch (refusal.field) {
        case "amount":
          return t("movements.error.amount");
        case "category":
          return t("movements.error.category");
        case "day":
          return t("movements.error.day");
        case "attribution":
          return t("movements.error.attribution");
        case "direction":
          // Only reachable from a form that carried no direction or a word
          // that is neither, which is a broken screen rather than a typo. It
          // is named anyway: a person who somehow sees it can act on it.
          return t("movements.error.direction");
        case "space":
          // The draft named no Space this Member is in. Nothing on the screen
          // is the problem, so pointing at a field would send them to fix the
          // wrong thing.
          return t("movements.error.space");
      }
  }
}
