import { t } from "@/i18n";
import { EntryHead } from "@/ui/entry-head";
import { Icon } from "@/ui/icon";
import styles from "./head.module.css";

/** What the canvas draws the pill's icon at. */
const PILL_ICON = 13;

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
 * pill stayed here when the head moved to `@/ui/entry-head`: the plan's entry
 * screen makes the same trade against the shell and has no attribution to
 * name, so it wears the head with nothing beneath it.
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
          <p className={styles.shared}>
            {/* The words beside it say what it is. */}
            <Icon name="users" size={PILL_ICON} />
            {t("movements.shared", { member: sharedWith })}
          </p>
        )
      }
    />
  );
}
