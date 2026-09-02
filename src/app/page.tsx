import { AppShell } from "@/ui/app-shell";
import { ButtonLink } from "@/ui/button";
import { Card } from "@/ui/card";
import { MainNavigation } from "./navigation";
import { Account } from "./account";
import { t } from "@/i18n";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <AppShell
      navigation={<MainNavigation activeId="budget" />}
      account={<Account />}
    >
      <header className={styles.header}>
        <h1 className={styles.title}>{t("home.title")}</h1>
      </header>

      <div className={styles.empty}>
        <Card>
          <h2 className={styles.emptyTitle}>{t("home.empty.title")}</h2>
          <p className={styles.emptyBody}>{t("home.empty.body")}</p>
          <ButtonLink href="/espacios/nuevo">{t("home.empty.action")}</ButtonLink>
        </Card>
      </div>
    </AppShell>
  );
}
