import Link from "next/link";
import { t } from "@/i18n";
import { Icon } from "@/ui/icon";
import { cx } from "@/ui/cx";
import { hitTarget } from "@/ui/hit-target";
import styles from "./head.module.css";

/** What the canvas draws the pill's icon at. */
const PILL_ICON = 13;

export type EntryHeadProps = {
  /** Where Cancelar goes: the list this was opened from. */
  back: string;
  /** The other Member's name, or nothing at all in a Space of one. */
  sharedWith: string | null;
};

/**
 * The head of a screen that is doing one thing.
 *
 * Cancelar sits here rather than at the foot of the page, which is where it
 * was: a person who changes their mind is at the top of the screen or at the
 * keypad, and neither is a scroll away from here.
 *
 * The pill under it says whose Space this is, because an expense in a shared
 * Space is about to be attributed to somebody, and the one thing worth saying
 * before that is which Space is being spent from. It is absent in a Space of
 * one, where it would state the obvious above the figure that matters.
 */
export function EntryHead({ back, sharedWith }: EntryHeadProps) {
  return (
    <div className={styles.head}>
      <div className={styles.bar}>
        <Link href={back} className={cx(hitTarget, styles.cancel)}>
          {t("action.cancel")}
        </Link>

        <h1 className={styles.title}>{t("movements.new.title")}</h1>

        {/*
          The same word again, invisible and unreachable: it is what makes the
          title centred on the screen rather than centred in what is left over
          beside Cancelar. A width would have to be guessed and would be wrong
          in another language.
        */}
        <span aria-hidden="true" className={styles.mirror}>
          {t("action.cancel")}
        </span>
      </div>

      {sharedWith === null ? null : (
        <p className={styles.shared}>
          {/* The words beside it say what it is. */}
          <Icon name="users" size={PILL_ICON} />
          {t("movements.shared", { member: sharedWith })}
        </p>
      )}
    </div>
  );
}
