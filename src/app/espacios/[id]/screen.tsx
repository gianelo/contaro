import type { ReactNode } from "react";
import { AppShell } from "@/ui/app-shell";
import type { Space } from "@/domain/space/space";
import { SpaceNavigation, type TabId } from "../../navigation";
import { Account } from "../../account";
import { currencyLabel } from "@/i18n/currency";
import styles from "./page.module.css";

/**
 * Every screen inside a Space: the shell, the tabs that stay within it, and
 * the header naming which Space this is.
 *
 * One place rather than one per route, because #6's Categories, #7's Movements
 * and #10's Budget are all screens of exactly this shape, and a screen that
 * forgets to say which Space it is showing is the one bug ADR-0010 exists to
 * make impossible. The currency sits beside the name because every figure
 * below is denominated in it and never in the reader's (ADR-0001).
 */
export function SpaceScreen({
  space,
  tab,
  children,
}: {
  space: Space;
  tab: TabId;
  children: ReactNode;
}) {
  return (
    <AppShell
      navigation={<SpaceNavigation spaceId={space.id} activeId={tab} />}
      account={<Account />}
    >
      <header className={styles.header}>
        <h1 className={styles.title}>{space.name}</h1>
        <p className={styles.currency}>{currencyLabel(space.currency)}</p>
      </header>

      {children}
    </AppShell>
  );
}
