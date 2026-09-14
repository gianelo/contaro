import { headers } from "next/headers";
import { AppShell } from "@/ui/app-shell";
import { currencyChoicesFor } from "./currencies";
import { NewSpaceForm } from "./form";

/**
 * Creating a Space happens outside every Space, so this screen has no tab bar
 * either (see `SpaceNavigation`).
 *
 * It carries none of the header the shell stacks -- no account row and no
 * Space heading -- and the canvas never drew one here (ADR-0059, ADR-0060): a
 * Space's name and currency are typed and not yet saved, and a screen holding
 * that trades the shell for room, the same trade the Movement entry screen and
 * both plan-item correction screens make.
 *
 * What it does wear is its own head, which is a different bar with a different
 * job: the way out and the way in, said across the top rather than at the foot
 * of a screen whose whole job is typing (#142, ADR-0028's argument again). It
 * used to render an `<h1>` and a `Cancelar` under the form; the canvas has
 * drawn the bar since it was first drawn, and ADR-0060 left the gap here by
 * name. `NewSpaceForm` renders it, because the control in it is the form's own
 * and its state is the form's own too.
 *
 * Reading the request's country makes this screen render per request, which is
 * the price of ordering the picker by where a person is. It is a screen behind
 * a session that renders a form, so there was nothing here worth caching.
 */
export default async function NewSpacePage() {
  return (
    <AppShell>
      <NewSpaceForm choices={currencyChoicesFor(await headers())} />
    </AppShell>
  );
}
