import { auth, signOut } from "@/auth";
import { Button } from "@/ui/button";
import { t } from "@/i18n";
import styles from "./account.module.css";

/**
 * Who is signed in, and the way out. Rendered into the app shell's `account`
 * slot, so every screen says whose session this is without being handed it.
 */
export async function Account() {
  const session = await auth();
  if (!session) return null;

  return (
    <section aria-label={t("account.label")} className={styles.account}>
      <span className={styles.name}>{session.user.name}</span>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/ingresar" });
        }}
      >
        <Button variant="plain" type="submit">
          {t("account.signOut")}
        </Button>
      </form>
    </section>
  );
}
