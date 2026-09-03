import { AppShell } from "@/ui/app-shell";
import { ButtonLink } from "@/ui/button";
import { Account } from "../../account";
import { t } from "@/i18n";
import { NewSpaceForm } from "./form";
import styles from "./page.module.css";

/**
 * Creating a Space happens outside every Space, so this screen has no tab bar
 * either (see `SpaceNavigation`). The way back is said out loud instead: a
 * person who opened this by mistake should not have to find the browser's
 * back button.
 */
export default function NewSpacePage() {
  return (
    <AppShell account={<Account />}>
      <h1 className={styles.title}>{t("space.new.title")}</h1>
      <NewSpaceForm />
      <div className={styles.back}>
        <ButtonLink href="/espacios" variant="plain">
          {t("action.cancel")}
        </ButtonLink>
      </div>
    </AppShell>
  );
}
