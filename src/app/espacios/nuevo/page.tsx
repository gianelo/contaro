import { headers } from "next/headers";
import { AppShell } from "@/ui/app-shell";
import { ButtonLink } from "@/ui/button";
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
 * No header either, and the canvas never drew one here (ADR-0059): a Space's
 * name and currency are typed and not yet saved, and a screen holding that
 * trades the shell for room -- the same trade the Movement entry screen and
 * both plan-item correction screens make. It used to render the account row
 * regardless, which is the drift ADR-0059 names and this removes.
 *
 * Reading the request's country makes this screen render per request, which is
 * the price of ordering the picker by where a person is. It is a screen behind
 * a session that renders a form, so there was nothing here worth caching.
 */
export default async function NewSpacePage() {
  return (
    <AppShell>
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
