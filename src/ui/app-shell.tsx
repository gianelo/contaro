import type { ReactNode } from "react";
import styles from "./app-shell.module.css";

export type AppShellProps = {
  /**
   * Whatever navigates the app. Today a <TabBar>; the shell does not know or
   * care that navigation happens to be a tab bar.
   */
  navigation?: ReactNode;
  /**
   * Whoever is signed in, and the way out. A slot for the same reason
   * navigation is one: the shell shows it, it does not decide what it is.
   */
  account?: ReactNode;
  children: ReactNode;
};

export function AppShell({ navigation, account, children }: AppShellProps) {
  return (
    <div className={styles.shell}>
      {account ? <div className={styles.account}>{account}</div> : null}
      <main className={styles.content}>{children}</main>
      {navigation ? (
        <div className={styles.navigation}>{navigation}</div>
      ) : null}
    </div>
  );
}
