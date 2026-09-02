import { AppShell } from "@/ui/app-shell";
import { MainNavigation } from "../navigation";
import { t } from "@/i18n";

export default function Page() {
  return (
    <AppShell navigation={<MainNavigation activeId="movements" />}>
      <h1>{t("nav.movements")}</h1>
    </AppShell>
  );
}
