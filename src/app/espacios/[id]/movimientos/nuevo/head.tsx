import { t } from "@/i18n";
import { EntryHead, EntryPill } from "@/ui/entry-head";

export type MovementEntryHeadProps = {
  /** Where Cancelar goes: the list this was opened from. */
  back: string;
  /** The other Member's name, or nothing at all in a Space of one. */
  sharedWith: string | null;
};

/**
 * The head of the screen an expense is recorded on: the entry head every
 * screen doing one thing wears, and the one line this screen puts under it.
 *
 * The pill says whose Space this is, because an expense in a shared Space is
 * about to be attributed to somebody, and the one thing worth saying before
 * that is which Space is being spent from. It is absent in a Space of one,
 * where it would state the obvious above the figure that matters.
 *
 * That argument is this screen's and not the entry head's, which is why the
 * decision to draw it at all stayed here when the pill's shape moved to
 * `@/ui/entry-head`: the screen that corrects a Movement wears the same shape
 * to say something else entirely (#73), and the plan's entry screen has no
 * attribution to name and wears the head with nothing beneath it.
 */
export function MovementEntryHead({
  back,
  sharedWith,
}: MovementEntryHeadProps) {
  return (
    <EntryHead
      back={back}
      cancel={t("action.cancel")}
      title={t("movements.new.title")}
      beneath={
        sharedWith === null ? null : (
          <EntryPill icon="users">
            {t("movements.shared", { member: sharedWith })}
          </EntryPill>
        )
      }
    />
  );
}
