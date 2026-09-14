"use client";

import { useState, useTransition } from "react";
import { BottomSheet } from "@/ui/bottom-sheet";
import { Button } from "@/ui/button";
import { GroupedList, GroupedListItem } from "@/ui/grouped-list";
import { Icon } from "@/ui/icon";
import { cx } from "@/ui/cx";
import { hitTarget } from "@/ui/hit-target";
import { t } from "@/i18n";
import { firstNameOf } from "./name";
import styles from "./space-menu.module.css";

/**
 * The Space the menu is about, in the little it needs to say so.
 *
 * Not a `Space`: this is drawn on the Spaces list too, where what is known
 * about the last-opened Space is a card's worth and not a row's. Three fields
 * both callers already hold, rather than a type one of them would have to go
 * and read a Space to satisfy.
 */
export type MenuSpace = {
  id: string;
  name: string;
  currency: string;
};

/**
 * The hamburger, and the menu behind it (#65, ADR-0059).
 *
 * The trigger and the sheet are one component because they are one control: a
 * caller that was handed them separately would be a caller holding the open
 * state of a menu it does not otherwise care about, on four screens.
 *
 * Sign-out lives in here now, and that is the whole confirmation the old
 * account row never had. It was a button in accent green beside a title, one
 * accidental press from ending a session; it is now a row inside a menu a
 * thumb opens on purpose first. Two deliberate taps, and no sheet whose only
 * job is asking "are you sure" -- the same trade ADR-0047 made for a struck
 * Movement, folded into the menu instead of standing beside it.
 *
 * A click and not a `<form>`, unlike the row this replaces. A form buys two
 * things: it works before any JavaScript has loaded, and it cannot fire twice
 * while the first one is in the air. The first is already spent -- this row is
 * behind a sheet that needs JavaScript to open at all -- and the second is
 * bought back below by refusing a second call while one is in flight.
 */
export function SpaceMenu({
  member,
  space,
  signOut,
}: {
  /**
   * Who is signed in, as the session or the ledger names them -- whole, and
   * `null` where a session names nobody. The sheet cuts it down to the name a
   * person is called by and titles itself with that, as the canvas draws it.
   *
   * Cut down here rather than by each caller, because the answer for "nobody"
   * is a decision about this sheet's own title: two callers deciding it apart
   * is two titles that can drift, and only one of them would be looked at.
   */
  member: string | null;
  /**
   * Which Space this menu is about, or `null` where there is none: a Member
   * who has never opened one. The rows that are a Space's go missing then, and
   * the way out does not.
   */
  space: MenuSpace | null;
  /** Ends the session. Handed in, because only the server can end one. */
  signOut: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [leaving, startLeaving] = useTransition();

  // Titled with the session where there is nobody to title it with. The menu
  // is still about something, and "Tu sesión" is what the group the way out
  // sits in is called anyway.
  const titled = member ? firstNameOf(member) : t("space.menu.session");

  return (
    <>
      <button
        type="button"
        aria-label={t("space.menu.open")}
        className={cx(hitTarget, styles.trigger)}
        onClick={() => setOpen(true)}
      >
        <Icon name="menu" />
      </button>

      <BottomSheet
        open={open}
        align="start"
        title={titled}
        onClose={() => setOpen(false)}
        actions={
          <Button variant="plain" onClick={() => setOpen(false)}>
            {t("action.cancel")}
          </Button>
        }
      >
        {space ? (
          <p className={styles.about}>
            {t("space.menu.about", {
              space: space.name,
              currency: space.currency,
            })}
          </p>
        ) : null}

        {space ? (
          <GroupedList label={space.name} labelHidden>
            <GroupedListItem
              href={`/espacios/${space.id}/ajustes`}
              onClick={() => setOpen(false)}
              leading={
                <span className={cx(styles.mark, styles.toSettings)}>
                  <Icon name="target" size={16} />
                </span>
              }
              trailing={<Icon name="chevron-right" size={16} />}
            >
              {t("nav.settings")}
            </GroupedListItem>
          </GroupedList>
        ) : null}

        {/*
          Its own group, and the canvas draws it that way: a gap between the
          rows that go somewhere and the one that ends the session is what
          stops a thumb reaching for Ajustes and finding the way out.

          Named for the one row it holds rather than for the session, which is
          what the sheet itself is titled with where there is nobody to title
          it with -- a group repeating the dialog's own name is a heading a
          screen reader reads twice and learns nothing from either time.
        */}
        <div className={styles.session}>
          <GroupedList label={t("space.menu.signOut")} labelHidden>
            <GroupedListItem
              onClick={() => {
                if (leaving) return;
                startLeaving(async () => {
                  await signOut();
                });
              }}
              leading={
                <span className={cx(styles.mark, styles.toLeave)}>
                  <Icon name="leave" size={16} />
                </span>
              }
            >
              <span className={styles.leave}>{t("space.menu.signOut")}</span>
            </GroupedListItem>
          </GroupedList>
        </div>
      </BottomSheet>
    </>
  );
}
