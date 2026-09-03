import type { ReadSession } from "@/auth/session";
import {
  UnusableCategoryError,
  type Category,
  type NewCategory,
} from "@/domain/category/category";
import type { Space } from "@/domain/space/space";
import { t } from "@/i18n";

export type FindSpace = (
  spaceId: string,
  memberId: string,
) => Promise<Space | null>;

export type SaveCategory = (draft: NewCategory) => Promise<Category>;

/**
 * What the form knows after a submission: nothing, or why it was refused.
 *
 * Here rather than beside the action itself: a "use server" module may export
 * async functions and nothing else, so a state constant living next to the
 * action compiles and then fails at runtime on the first request.
 */
export type NewCategoryState = { error: string | null };

export const nothingWrongYet: NewCategoryState = { error: null };

export type AddCategoryOutcome =
  | { kind: "added"; category: Category }
  | { kind: "rejected"; field: UnusableCategoryError["field"] }
  | { kind: "not-signed-in" }
  | { kind: "no-such-space" }
  | { kind: "failed"; cause: unknown };

/**
 * The seam #6 is proven at: a signed-in Member's answers become a Category
 * inside a Space they are really in, and everything else becomes a refusal a
 * screen can act on.
 *
 * Membership is asked again here, on a Space the form named. The GET that
 * rendered the form proved it, but a form field is a claim: without this, the
 * Space someone types into is the Space whose identifier they guessed, and
 * "a Category added in one Space is invisible from another" would hold for
 * reading while leaking on writing.
 */
export async function handleAddCategory(
  readSession: ReadSession,
  findSpace: FindSpace,
  saveCategory: SaveCategory,
  draft: NewCategory,
): Promise<AddCategoryOutcome> {
  const session = await readSession();

  if (session === null) {
    return { kind: "not-signed-in" };
  }

  try {
    const space = await findSpace(draft.spaceId, session.memberId);

    // Not found rather than forbidden, the way `currentSpace` refuses: saying
    // a Space exists but is not theirs is already saying something about it.
    if (space === null) {
      return { kind: "no-such-space" };
    }

    const category = await saveCategory(draft);
    return { kind: "added", category };
  } catch (error) {
    // A bad answer is the person's to fix and is named on the screen. Anything
    // else is ours, and saying "the name is wrong" about a dropped connection
    // would send them to correct a field that was never the problem.
    if (error instanceof UnusableCategoryError) {
      return { kind: "rejected", field: error.field };
    }
    return { kind: "failed", cause: error };
  }
}

/**
 * What a refused Category says on the screen.
 *
 * Kept beside the outcomes it maps, so adding an outcome without deciding what
 * a person is told about it is a type error rather than a blank screen.
 */
export function refusalMessage(
  outcome: Exclude<AddCategoryOutcome, { kind: "added" }>,
): string {
  switch (outcome.kind) {
    case "not-signed-in":
      return t("categories.new.error.signedOut");
    case "no-such-space":
      return t("categories.new.error.space");
    case "failed":
      return t("categories.new.error.failed");
    case "rejected":
      switch (outcome.field) {
        case "name":
          return t("categories.new.error.name");
        case "parent":
          return t("categories.new.error.parent");
        case "space":
          // The draft named no Space at all. Nothing on this form is the
          // problem, so pointing at a field would send them to fix the wrong
          // thing.
          return t("categories.new.error.space");
      }
  }
}
