import type { ReactNode } from "react";
import styles from "./app-shell.module.css";

export type AppShellProps = {
  /**
   * Whatever navigates the app. Today a <TabBar>; the shell does not know or
   * care that navigation happens to be a tab bar.
   */
  navigation?: ReactNode;
  /**
   * The header of the product: who is signed in, and the controls that belong
   * beside them (ADR-0059). A slot for the same reason navigation is one -- the
   * shell shows it, it does not decide what it is.
   *
   * It was called `account` while it held a name and a green `Salir`, which is
   * the pair ADR-0059 broke up. The slot outlives that row because what it
   * really does is stack something above the content and outside it: inside
   * `main` the header would scroll away with what it heads, and inset itself
   * twice over on the content's own gutter.
   */
  header?: ReactNode;
  children: ReactNode;
};

export function AppShell({ navigation, header, children }: AppShellProps) {
  return (
    <div className={styles.shell}>
      {header ? <div className={styles.header}>{header}</div> : null}
      <main className={styles.content}>{children}</main>
      {navigation ? (
        <div className={styles.navigation}>{navigation}</div>
      ) : null}
    </div>
  );
}
