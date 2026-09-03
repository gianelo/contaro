import { headers } from "next/headers";
import { AppShell } from "@/ui/app-shell";
import { ButtonLink } from "@/ui/button";
import { Account } from "../../account";
import { t } from "@/i18n";
import { currencyChoicesFor } from "./currencies";
import { NewSpaceForm } from "./form";
import styles from "./page.module.css";

/**
 * Creating a Space happens outside every Space, so this screen has no tab bar
 * either (see `SpaceNavigation`). The way back is said out loud instead: a
 * person who opened this by mistake should not have to find the browser's
 * back button.
 *
 * Reading the request's country makes this screen render per request, which is
 * the price of ordering the picker by where a person is. It is a screen behind
 * a session that renders a form, so there was nothing here worth caching.
 */
export default async function NewSpacePage() {
  return (
    <AppShell account={<Account />}>
      <h1 className={styles.title}>{t("space.new.title")}</h1>
      <NewSpaceForm choices={currencyChoicesFor(await headers())} />
      <div className={styles.back}>
        <ButtonLink href="/espacios" variant="plain">
          {t("action.cancel")}
        </ButtonLink>
      </div>
    </AppShell>
  );
}
