import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { database } from "@/db/client";
import { findSpaceForMember } from "@/db/spaces";
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
  // The proxy keeps a signed-out request off every page but /ingresar. This is
  // what happens if that ever stops being true.
  const session = await auth();
  if (!session) notFound();

  const space = await findSpaceForMember(database(), id, session.user.id);
  if (!space) notFound();

  return space;
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
