import type { ReactNode } from "react";
import { AppShell } from "@/ui/app-shell";
import type { Space } from "@/domain/space/space";
import { SpaceNavigation, type TabId } from "../../navigation";
import { Account } from "../../account";
import { SpaceHead } from "./head";

/**
 * Every screen inside a Space: the shell, the tabs that stay within it, and
 * the header naming which Space this is.
 *
 * One place rather than one per route, because #6's Categories, #7's Movements
 * and #10's Budget are all screens of exactly this shape, and a screen that
 * forgets to say which Space it is showing is a screen a person in two Spaces
 * cannot trust. That is a product rule and not ADR-0010's: ADR-0010 says the
 * identifier lives in the URL and every route re-checks membership against it,
 * which is what makes the *address* honest. Saying it in words is what makes
 * the screen honest, and it has no other home than here. The currency is said
 * with it because every figure below is denominated in it and never in the
 * reader's (ADR-0001).
 *
 * What the head says is `SpaceHead`'s, and a screen with a name of its own
 * passes it: the Budget screen is titled "Presupuesto" and the Space drops to
 * the line under it (#40).
 */
export function SpaceScreen({
  space,
  tab,
  title,
  beside,
  children,
}: {
  space: Space;
  tab: TabId;
  /** What this screen calls itself, where it is not simply the Space. */
  title?: string;
  /** What shares the title's row: the month pill, where a screen has one. */
  beside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <AppShell
      navigation={<SpaceNavigation spaceId={space.id} activeId={tab} />}
      account={<Account />}
    >
      <SpaceHead space={space} title={title} beside={beside} />

      {children}
    </AppShell>
  );
}
