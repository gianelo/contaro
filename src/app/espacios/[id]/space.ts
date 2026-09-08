import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { database } from "@/db/client";
import {
  findSpaceForMember,
  markSpaceOpened,
  type SpaceOpening,
} from "@/db/spaces";
import type { Space } from "@/domain/space/space";

/**
 * The Space a route inside `/espacios/[id]` is about.
 *
 * Every such route asks again rather than trusting a parent layout, so
 * membership is checked on the way into each screen and not once on the way
 * into the section. A Space someone is not in is not found rather than
 * forbidden — saying it exists is already saying something about it — so an
 * identifier passed between people buys nothing.
 */
export async function currentSpace(id: string): Promise<Space> {
  return (await openSpace(id)).space;
}

/**
 * The same Space, with what this Member's membership row said the instant
 * before this request touched it.
 *
 * The Budget screen asks for this one and every other route asks for the Space
 * alone, because only the Budget screen has anything to say about a month that
 * ended (#118). They are the same act either way: opening a Space is what makes
 * it the one being used, and the history it replaces is only readable here,
 * from inside the act that replaces it.
 */
export async function openSpace(
  id: string,
): Promise<{ space: Space; opening: SpaceOpening | null }> {
  // The proxy keeps a signed-out request off every page but /ingresar. This is
  // what happens if that ever stops being true.
  const session = await auth();
  if (!session) notFound();

  const db = database();
  const space = await findSpaceForMember(db, id, session.user.id);
  if (!space) notFound();

  /*
   * Opening a Space is what makes it the one being used, and this is where
   * opening one happens: every route inside `/espacios/[id]` comes through
   * here, so a Space reached from a bookmark counts exactly as much as one
   * reached from the list (#38).
   *
   * Written after the Space has been proved to be this Member's, not before:
   * the pair is the primary key of the membership row, so a Member who is not
   * in it would update nothing anyway -- but a write that runs before the
   * refusal is a write nobody meant to authorise.
   *
   * Awaited rather than left running, and now for a second reason on top of
   * the first: a write let go of in a server component is a write the request
   * can outlive, so the badge would be right or wrong depending on how fast the
   * page finished -- and what it answers is what the screen above it draws.
   */
  const opening = await markSpaceOpened(db, space.id, session.user.id);

  return { space, opening };
}

/**
 * The Member looking at this screen.
 *
 * Beside `currentSpace` rather than inside it, because most screens under
 * `/espacios/[id]` need the Space and not the person: the membership question
 * is already answered by the Space coming back at all. The entry screen needs
 * the person too, to fill "Es plata de" in with them — and `auth()` is
 * deduplicated within a request, so asking twice costs nothing.
 */
export async function viewingMember(): Promise<string> {
  const session = await auth();
  if (!session) notFound();
  return session.user.id;
}
