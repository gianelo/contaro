import { TabBar, type Tab } from "@/ui/tab-bar";
import { t } from "@/i18n";

/** The closed set of destinations, so a typo in activeId is a type error. */
export type TabId = "budget" | "movements" | "categories" | "spaces";

/**
 * Navigation exists inside a Space, because every screen it reaches is about
 * one Space's money (#5). The Space is carried in the URL and nowhere else: no
 * cookie, no session field, nothing a person could be looking at without the
 * address bar saying so.
 *
 * The Space list itself has no tab bar. It is what a Member lands on and what
 * they come back to, and the two other tabs would have no Space to point at.
 */
function spaceTabs(spaceId: string): readonly Tab<TabId>[] {
  const inside = `/espacios/${spaceId}`;

  return [
    { id: "budget", href: inside, label: t("nav.budget") },
    {
      id: "movements",
      href: `${inside}/movimientos`,
      label: t("nav.movements"),
    },
    {
      id: "categories",
      href: `${inside}/categorias`,
      label: t("nav.categories"),
    },
    { id: "spaces", href: "/espacios", label: t("nav.spaces") },
  ];
}

export function SpaceNavigation({
  spaceId,
  activeId,
}: {
  spaceId: string;
  activeId: TabId;
}) {
  return <TabBar tabs={spaceTabs(spaceId)} activeId={activeId} />;
}
