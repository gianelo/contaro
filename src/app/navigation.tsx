import { TabBar, type Tab } from "@/ui/tab-bar";
import { t } from "@/i18n";

/** The closed set of destinations, so a typo in activeId is a type error. */
export type TabId = "budget" | "movements" | "spaces";

/**
 * The tabs the app ships with today. The shell takes navigation as a slot, so
 * replacing this with a drawer or a segmented control touches only this file.
 */
export const tabs: readonly Tab<TabId>[] = [
  { id: "budget", href: "/", label: t("nav.budget") },
  { id: "movements", href: "/movimientos", label: t("nav.movements") },
  { id: "spaces", href: "/espacios", label: t("nav.spaces") },
];

export function MainNavigation({ activeId }: { activeId: TabId }) {
  return <TabBar tabs={tabs} activeId={activeId} />;
}
