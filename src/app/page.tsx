import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { database } from "@/db/client";
import { invitationsWaitingFor } from "@/db/invitations";
import { lastOpenedSpace, listSpacesForMember } from "@/db/spaces";
import { whereToLand } from "./landing";

/**
 * The signpost the app is opened at, which now asks something before pointing
 * (#108).
 *
 * It used to redirect to `/espacios` and nothing else, so a Member with one
 * Space met a full screen, a heading and a tap to read the only card on it,
 * every single time they opened the app. Signing in returns here too
 * (`ingresar/page.tsx`), so this one file decides the landing for arriving and
 * for signing in both.
 *
 * Three reads and no render. The two that answer "which Space" are the two
 * `spacesToChooseFrom` already opens with, and the third is the one that keeps
 * an Invitation from being lost — see `whereToLand`, which is where all three
 * are turned into an answer. `spacesToChooseFrom` itself is deliberately not
 * called: it goes on to read every Space's month for cards this route never
 * draws.
 *
 * ADR-0010 still holds. Nothing is written, nothing is remembered, and the
 * Space is still named by the URL and by nothing else: what is read here is a
 * moment on a membership row that #38 already writes on every opening
 * (ADR-0029), and the route it redirects to re-proves membership on arrival
 * the way every route inside a Space does. What ADR-0010 loses is the one
 * sentence saying `/` goes to the list, and its amendment says so; ADR-0063 is
 * the rule that replaced it.
 */
export default async function HomePage() {
  /*
   * The proxy keeps a signed-out request off every page but `/ingresar`. If
   * that ever stops being true, this points at the list and the list refuses,
   * which is what it already does: a signpost is not the place to invent a
   * second way of saying no.
   */
  const session = await auth();
  if (!session) redirect("/espacios");

  const db = database();

  const [listed, lastOpenedId, waiting] = await Promise.all([
    listSpacesForMember(db, session.user.id),
    lastOpenedSpace(db, session.user.id),
    invitationsWaitingFor(db, session.user.id),
  ]);

  const landing = whereToLand({
    spaceIds: listed.map(({ space }) => space.id),
    lastOpenedId,
    invitationsWaiting: waiting.length,
  });

  /*
   * Redirecting into a Space marks it opened on arrival (ADR-0029), so the
   * landing reinforces itself: tomorrow's answer is today's. Harmless for the
   * rule and worth naming, because of what it costs — `/` stops being a way to
   * reach the list, and the Espacios tab inside a Space becomes the only one.
   */
  redirect(landing.kind === "space" ? `/espacios/${landing.id}` : "/espacios");
}
