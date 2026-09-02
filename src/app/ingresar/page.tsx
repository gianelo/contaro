import { signIn } from "@/auth";
import { Button } from "@/ui/button";
import { Card } from "@/ui/card";
import { t } from "@/i18n";
import styles from "./page.module.css";

/**
 * The only screen a signed-out person can reach. Everything else is behind the
 * session (see `src/proxy.ts`).
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Auth.js sends a refused sign-in back here with a reason. Without saying
  // it, the screen would show the same button again and look like nothing
  // happened. `AccessDenied` is what our own check on a verified Google
  // address produces (see `src/auth/index.ts`).
  const { error } = await searchParams;
  const message =
    error === undefined
      ? null
      : error === "AccessDenied"
        ? t("signin.error.unverified")
        : t("signin.error.other");

  return (
    <main className={styles.page}>
      <Card>
        <h1 className={styles.title}>{t("signin.title")}</h1>
        <p className={styles.body}>{t("signin.body")}</p>
        {message ? (
          <p role="alert" className={styles.error}>
            {message}
          </p>
        ) : null}
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <Button type="submit">{t("signin.action")}</Button>
        </form>
      </Card>
    </main>
  );
}
