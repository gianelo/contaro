import { AppShell } from "@/ui/app-shell";
import { MainNavigation } from "../../navigation";
import { Account } from "../../account";
import { t } from "@/i18n";
import { NewSpaceForm } from "./form";
import styles from "./page.module.css";

export default function NewSpacePage() {
  return (
    <AppShell
      navigation={<MainNavigation activeId="spaces" />}
      account={<Account />}
    >
      <h1 className={styles.title}>{t("space.new.title")}</h1>
      <NewSpaceForm />
    </AppShell>
  );
}
