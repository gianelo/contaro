import Link from "next/link";
import styles from "./tab-bar.module.css";
import { cx } from "./cx";
import { hitTarget } from "./hit-target";
import { t } from "@/i18n";

export type Tab<Id extends string> = {
  id: Id;
  href: string;
  label: string;
};

export type TabBarProps<Id extends string> = {
  tabs: readonly Tab<Id>[];
  activeId: Id;
};

/**
 * One implementation of the app shell's navigation slot. It is passed into
 * <AppShell navigation={...}>, never assumed by it.
 */
export function TabBar<Id extends string>({
  tabs,
  activeId,
}: TabBarProps<Id>) {
  return (
    <nav aria-label={t("nav.main")} className={styles.bar}>
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          aria-current={tab.id === activeId ? "page" : undefined}
          className={cx(
            hitTarget,
            styles.tab,
            tab.id === activeId && styles.active,
          )}
        >
          <span>{tab.label}</span>
        </Link>
      ))}
    </nav>
  );
}
