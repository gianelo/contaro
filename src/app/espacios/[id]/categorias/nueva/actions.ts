"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { database } from "@/db/client";
import { addCategoryToSpace } from "@/db/categories";
import { findSpaceForMember } from "@/db/spaces";
import { answer } from "@/app/form";
import {
  handleAddCategory,
  refusalMessage,
  type NewCategoryState,
} from "../add";

/**
 * All the behaviour is in `add.ts`, which is driven directly by tests. This
 * only says where a session, a Space and a store come from in production, and
 * where a Member goes once their Category exists.
 */
export async function addCategoryAction(
  _previous: NewCategoryState,
  form: FormData,
): Promise<NewCategoryState> {
  const spaceId = answer(form, "spaceId");
  const parentId = answer(form, "parentId");

  const outcome = await handleAddCategory(
    async () => {
      const session = await auth();
      return session ? { memberId: session.user.id } : null;
    },
    (id, memberId) => findSpaceForMember(database(), id, memberId),
    (draft) => addCategoryToSpace(database(), draft),
    {
      spaceId,
      // The picker's "no parent" option carries an empty value, which is a
      // top-level Category and not an identifier nobody has.
      parentId: parentId === "" ? null : parentId,
      name: answer(form, "name"),
    },
  );

  if (outcome.kind === "failed") {
    // The person is told something went wrong; the server is told what.
    console.error("Adding a Category failed.", outcome.cause);
  }

  if (outcome.kind === "added") {
    // Outside the handler's try on purpose: redirect works by throwing, so
    // catching around it would swallow the navigation. Back to the catalogue,
    // which is where the new Category now is.
    redirect(`/espacios/${spaceId}/categorias`);
  }

  return { error: refusalMessage(outcome) };
}
