import { t } from "@/i18n";
import { EntryHead, EntryPill } from "@/ui/entry-head";

export type MovementCorrectionHeadProps = {
  /** Where Cancelar goes: the list this Movement was opened from. */
  back: string;
  /** Whoever typed it in, or nothing at all where the Space no longer has them. */
  recordedBy: string | null;
};

/**
 * The head of the screen a Movement is corrected on.
 *
 * The same head the entry screen wears, because the two screens are doing the
 * same thing: holding answers that are typed and not yet saved (#73, ADR-0046).
 * Cancelar sits in it rather than at the foot, which is where this screen had
 * it -- a person who changes their mind about a correction is at the top of
 * the screen or at the keypad, and neither is a scroll away from here.
 *
 * The pill is the counterpart of the entry screen's, and it says the other
 * half of story 22 in #1: `recordedBy` is never editable, which is enforced by
 * there being no field for it, and this is what makes it a record somebody can
 * actually read. A `note` and not merely a line of words, because that is what
 * it is -- something true about the Movement rather than something to act on.
 */
export function MovementCorrectionHead({
  back,
  recordedBy,
}: MovementCorrectionHeadProps) {
  return (
    <EntryHead
      back={back}
      cancel={t("action.cancel")}
      title={t("movements.edit.title")}
      beneath={
        recordedBy === null ? null : (
          <EntryPill icon="person" role="note">
            {t("movements.recordedBy", { member: recordedBy })}
          </EntryPill>
        )
      }
    />
  );
}
