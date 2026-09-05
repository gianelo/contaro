import Link from "next/link";
import styles from "./tab-bar.module.css";
import { cx } from "./cx";
import { hitTarget } from "./hit-target";
import { Icon, type IconName } from "./icon";
import { t } from "@/i18n";

export type Tab<Id extends string> = {
  id: Id;
  href: string;
  label: string;
  icon: IconName;
};

/**
 * The one thing on the bar that does something rather than going somewhere.
 *
 * It carries a `label` and no text: the canvas draws a plus and nothing else,
 * so the name is the only thing a screen reader has to go on.
 */
export type RaisedAction = {
  href: string;
  label: string;
};

export type TabBarProps<Id extends string> = {
  tabs: readonly Tab<Id>[];
  activeId: Id;
  action?: RaisedAction;
};

/** What the canvas draws the raised button's plus at: 26px, and heavier. */
const PLUS_SIZE = 26;
const PLUS_WEIGHT = 2.4;

/**
 * One implementation of the app shell's navigation slot. It is passed into
 * <AppShell navigation={...}>, never assumed by it.
 *
 * The raised button in the middle is the point of the bar. A person records an
 * expense in under ten seconds only if the way in is under their thumb on
 * whatever screen they are already looking at; a link at the foot of one list
 * is a scroll away on that screen and absent from every other. So it sits in
 * the middle, where either thumb reaches it, and it is not a tab: it is the
 * only control here that does something instead of going somewhere.
 */
export function TabBar<Id extends string>({
  tabs,
  activeId,
  action,
}: TabBarProps<Id>) {
  // Split rather than appended: the button hangs between the second
  // destination and the third, so the four labels stay evenly spread and the
  // gap it sits in is the middle of the bar rather than the end of it.
  const middle = Math.floor(tabs.length / 2);

  const destination = (tab: Tab<Id>) => (
    <Link
      key={tab.id}
      href={tab.href}
      aria-current={tab.id === activeId ? "page" : undefined}
      className={cx(hitTarget, styles.tab, tab.id === activeId && styles.active)}
    >
      {/*
        No label on the icon: the word under it already says where the tab
        goes, and a screen reader that heard both would hear the destination
        twice and mean it once.
      */}
      <Icon name={tab.icon} />
      <span>{tab.label}</span>
    </Link>
  );

  return (
    <nav aria-label={t("nav.main")} className={styles.bar}>
      {tabs.slice(0, middle).map(destination)}

      {action === undefined ? null : (
        <Link
          href={action.href}
          aria-label={action.label}
          className={cx(hitTarget, styles.action)}
        >
          <Icon name="plus" size={PLUS_SIZE} weight={PLUS_WEIGHT} />
        </Link>
      )}

      {tabs.slice(middle).map(destination)}
    </nav>
  );
}
