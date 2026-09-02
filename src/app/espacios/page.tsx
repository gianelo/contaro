import { AppShell } from "@/ui/app-shell";
import { MainNavigation } from "../navigation";
import { t } from "@/i18n";

export default function Page() {
  return (
    <AppShell navigation={<MainNavigation activeId="spaces" />}>
      <h1>{t("nav.spaces")}</h1>
    </AppShell>
  );
}
