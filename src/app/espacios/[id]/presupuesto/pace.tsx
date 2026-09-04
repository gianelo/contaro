import { GroupedListItem } from "@/ui/grouped-list";
import { Icon } from "@/ui/icon";
import { cx } from "@/ui/cx";
import type { ReadablePace } from "./budget";
import styles from "./pace.module.css";

/**
 * Whether the month is ahead of or behind the pace of its Variable items (#14).
 *
 * One line of words and not a panel, which is what the canvas draws and what
 * the answer wants to be: the meters above already show how much of each plan
 * has gone, and a third bar to compare them against the calendar would be one
 * more thing to read rather than the thing being read. A person needs telling,
 * in a sentence, whether they are early or late.
 *
 * A row of the month's own group rather than a block of its own, because that
 * group is the summary card the canvas draws this inside: "Gastado" and then
 * how that is going. It renders nothing at all where there is no pace -- a
 * month nobody is standing in, or one with no Variable item to spread.
 *
 * Amber and the circle only past the pace. Behind it and on it are the same
 * quiet sentence: an alert beside "you have spent less than you planned to by
 * now" is a warning about nothing.
 */
export function Pace({ pace }: { pace: ReadablePace | null }) {
  if (pace === null) return null;

  return (
    <GroupedListItem>
      <span className={cx(styles.line, pace.ahead && styles.past)}>
        {/*
          No label on the icon: the words beside it are the message, and a
          screen reader that heard "alert circle" first would hear the same
          fact twice. Colour is never the only carrier either -- "arriba del
          ritmo" is written out, so the amber is the second way of saying it.
        */}
        {pace.ahead ? (
          <span className={styles.mark}>
            <Icon name="alert-circle" size={15} />
          </span>
        ) : null}
        <span>
          {pace.lead} <strong className={styles.standing}>{pace.standing}</strong>
        </span>
      </span>
    </GroupedListItem>
  );
}
