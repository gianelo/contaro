import type { ReactNode } from "react";
import styles from "./app-shell.module.css";

export type AppShellProps = {
  /**
   * Whatever navigates the app. Today a <TabBar>; the shell does not know or
   * care that navigation happens to be a tab bar.
   */
  navigation?: ReactNode;
  children: ReactNode;
};

export function AppShell({ navigation, children }: AppShellProps) {
  return (
    <div className={styles.shell}>
      <main className={styles.content}>{children}</main>
      {navigation ? (
        <div className={styles.navigation}>{navigation}</div>
      ) : null}
    </div>
  );
}
