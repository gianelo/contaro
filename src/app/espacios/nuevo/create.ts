import type { ReadSession } from "@/auth/session";
import { UnusableSpaceError, type Space } from "@/domain/space/space";
import { t } from "@/i18n";

export type SaveSpace = (
  creatorId: string,
  draft: { name: string; currency: string },
) => Promise<Space>;

/**
 * What the form knows after a submission: nothing, or why it was refused.
 *
 * Here rather than beside the action itself: a "use server" module may export
 * async functions and nothing else, so a state constant living next to the
 * action compiles and then fails at runtime on the first request.
 */
export type NewSpaceState = { error: string | null };

export const nothingWrongYet: NewSpaceState = { error: null };

export type CreateSpaceOutcome =
  | { kind: "created"; space: Space }
  | { kind: "rejected"; field: UnusableSpaceError["field"] }
  | { kind: "not-signed-in" }
  | { kind: "failed"; cause: unknown };

/**
 * The seam ticket #4 is proven at: a signed-in Member's answers become a Space
 * they are inside, and everything else becomes a refusal a screen can act on.
 *
 * The session and the store both arrive as arguments, so the whole path — who
 * is asking, what the domain makes of their answers, what is written down — is
 * driven without a server, a browser or a database.
 */
export async function handleCreateSpace(
  readSession: ReadSession,
  saveSpace: SaveSpace,
  draft: { name: string; currency: string },
): Promise<CreateSpaceOutcome> {
  const session = await readSession();

  if (session === null) {
    return { kind: "not-signed-in" };
  }

  try {
    // The creator is the session's Member and never a form field: whoever is
    // signed in is who this Space belongs to, and the form has no say in it.
    const space = await saveSpace(session.memberId, draft);
    return { kind: "created", space };
  } catch (error) {
    // A bad answer is the person's to fix and is named on the screen. Anything
    // else is ours, and saying "the name is wrong" about a dropped connection
    // would send them to correct a field that was never the problem.
    if (error instanceof UnusableSpaceError) {
      return { kind: "rejected", field: error.field };
    }
    return { kind: "failed", cause: error };
  }
}

/**
 * What a refused creation says on the screen.
 *
 * Kept beside the outcomes it maps, so adding an outcome without deciding what
 * a person is told about it is a type error rather than a blank screen.
 */
export function refusalMessage(
  outcome: Exclude<CreateSpaceOutcome, { kind: "created" }>,
): string {
  switch (outcome.kind) {
    case "not-signed-in":
      return t("space.new.error.signedOut");
    case "failed":
      return t("space.new.error.failed");
    case "rejected":
      switch (outcome.field) {
        case "name":
          return t("space.new.error.name");
        case "currency":
          return t("space.new.error.currency");
        case "creator":
          // The session named no Member at all. Nothing on this form is the
          // problem, so pointing at a field would send them to fix the wrong
          // thing.
          return t("space.new.error.signedOut");
      }
  }
}
