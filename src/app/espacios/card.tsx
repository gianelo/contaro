import Link from "next/link";
import { Badge } from "@/ui/badge";
import { MemberAvatars } from "@/ui/member-avatars";
import { cx } from "@/ui/cx";
import { t } from "@/i18n";
import type { ReadableSpace } from "./listing";
import styles from "./card.module.css";

/**
 * One Space on the list a Member lands on (#38): who is in it, what money it
 * holds, and where the month stands before anybody opens it.
 *
 * A card and not a row, because a row had space for a name and a currency and
 * nothing else — and story 5 of #1 asks this list to answer "where do I stand"
 * without opening anything, which is two more figures than a row can hold.
 *
 * The way in is one link covering the whole card and named by the heading it
 * is not inside. Both halves of that are deliberate. Covering the card is what
 * makes a thumb able to hit it -- a link the size of a line of text inside
 * something that looks entirely tappable is the gap between what a card
 * promises and what it does, and it is a real box rather than a stretched
 * pseudo-element so that the 44px measured in a browser is the one a finger
 * meets. Naming it by the heading is what keeps somebody moving through the
 * page by links hearing "Compartido con Ana" instead of the whole card read
 * out as one run-on sentence -- while the figures stay ordinary text that the
 * same reader still meets on their way down it.
 *
 * It does not prefetch, and that is load-bearing rather than thrift. Opening a
 * Space is what marks it the one being used (`currentSpace`), so a router that
 * fetched all three cards on the way past would mark all three opened and the
 * "Activo" badge would land on whichever request happened to finish last.
 */
export function SpaceCard({ space }: { space: ReadableSpace }) {
  const named = `space-${space.id}-name`;

  return (
    <article className={cx(styles.card, space.lastOpened && styles.lastOpened)}>
      {/*
        Empty on purpose, and named by the heading below rather than by words
        of its own: an `aria-label` here would be a second copy of the Space's
        name to keep in step with the first.
      */}
      <Link
        href={`/espacios/${space.id}`}
        prefetch={false}
        aria-labelledby={named}
        className={styles.cover}
      />

      <div className={styles.head}>
        <MemberAvatars members={space.members} />

        <div className={styles.naming}>
          <h3 id={named} className={styles.name}>
            {space.name}
          </h3>
          <p className={styles.who}>{space.who}</p>
        </div>

        {/*
          In a word as well as in the outline. The accent border is how a
          thumb finds this card in a column of them; the badge is how the same
          fact reaches somebody who cannot see the border at all.
        */}
        {space.lastOpened ? <Badge variant="accent">{t("spaces.active")}</Badge> : null}
      </div>

      {/*
        Story 5 of #1, and the one story on the whole list that no ticket ever
        carried. A description list because that is what these are: two labels
        and the figure each one names. Labelled by the Space, so a screen with
        three cards on it has three groups a reader can tell apart.
      */}
      <dl className={styles.standing}>
        <div className={styles.figure}>
          <dt className={styles.label}>{t("spaces.card.spent")}</dt>
          <dd className={styles.spent}>{space.spent}</dd>
        </div>
        <div className={styles.figure}>
          <dt className={styles.label}>{t("spaces.card.expected")}</dt>
          <dd className={styles.expected}>{space.expected}</dd>
        </div>
      </dl>
    </article>
  );
}
