import { TabBar, type Tab } from "@/ui/tab-bar";
import { t } from "@/i18n";

/** The closed set of destinations, so a typo in activeId is a type error. */
export type TabId = "budget" | "movements" | "spaces" | "settings";

/**
 * Navigation exists inside a Space, because every screen it reaches is about
 * one Space's money (#5). The Space is carried in the URL and nowhere else: no
 * cookie, no session field, nothing a person could be looking at without the
 * address bar saying so.
 *
 * The Space list itself has no tab bar. It is what a Member lands on and what
 * they come back to, and the two other tabs would have no Space to point at.
 *
 * Four destinations and not five: these are the places a thumb goes every day.
 * The Categories catalogue is not one of them -- a person writes it once and
 * then rarely -- so it moved inside Ajustes, which is where whatever comes next
 * that is not money will go too.
 */
function spaceTabs(spaceId: string): readonly Tab<TabId>[] {
  const inside = `/espacios/${spaceId}`;

  return [
    {
      id: "budget",
      href: inside,
      label: t("nav.budget"),
      // The tab's calendar and not the day pill's: this one carries a day
      // inside its grid, so it reads as a month rather than as an empty box.
      icon: "calendar-day",
    },
    {
      id: "movements",
      href: `${inside}/movimientos`,
      label: t("nav.movements"),
      icon: "list",
    },
    { id: "spaces", href: "/espacios", label: t("nav.spaces"), icon: "users" },
    {
      id: "settings",
      href: `${inside}/ajustes`,
      label: t("nav.settings"),
      icon: "target",
    },
  ];
}

export function SpaceNavigation({
  spaceId,
  activeId,
}: {
  spaceId: string;
  activeId: TabId;
}) {
  return (
    <TabBar
      tabs={spaceTabs(spaceId)}
      activeId={activeId}
      // Reachable from every screen inside the Space, because the bar is: the
      // ten seconds an expense is allowed to take are spent walking to it, and
      // a link at the foot of one list is a walk from everywhere else.
      action={{
        href: `/espacios/${spaceId}/movimientos/nuevo`,
        label: t("movements.new"),
      }}
    />
  );
}
