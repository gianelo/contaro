import { describe, expect, it, vi } from "vitest";
import { UnusableCategoryError, type Category } from "@/domain/category/category";
import type { Space } from "@/domain/space/space";
import { handleAddCategory, refusalMessage } from "./add";

const ana = { memberId: "member-ana" };
const casa: Space = { id: "space-casa", name: "Casa", currency: "ARS" };

const mate: Category = {
  id: "category-mate",
  spaceId: casa.id,
  parentId: null,
  label: { kind: "own", name: "Mate" },
};

const signedIn = async () => ana;
const signedOut = async () => null;
const hers = async () => casa;
const notHers = async () => null;
const saved = () => vi.fn(async () => mate);

const draft = { spaceId: casa.id, parentId: null, name: "Mate" };

describe("a Member adding a Category to their Space", () => {
  it("adds it and hands back the Category", async () => {
    await expect(
      handleAddCategory(signedIn, hers, saved(), draft),
    ).resolves.toEqual({ kind: "added", category: mate });
  });

  it("refuses a request carrying no session", async () => {
    const save = saved();

    await expect(handleAddCategory(signedOut, hers, save, draft)).resolves.toEqual(
      { kind: "not-signed-in" },
    );
    expect(save).not.toHaveBeenCalled();
  });

  it("refuses to write into a Space the Member is not in, and writes nothing", async () => {
    // The Space arrives in the form, so it is a claim and not a fact. The GET
    // that rendered the form proved membership; this request has to prove it
    // again or the form is a way into any Space whose identifier is guessed.
    const save = saved();

    await expect(
      handleAddCategory(signedIn, notHers, save, draft),
    ).resolves.toEqual({ kind: "no-such-space" });
    expect(save).not.toHaveBeenCalled();
  });

  it("asks about the Space the form named, as the Member who is signed in", async () => {
    const findSpace = vi.fn(async () => casa);

    await handleAddCategory(signedIn, findSpace, saved(), draft);

    expect(findSpace).toHaveBeenCalledWith(casa.id, ana.memberId);
  });

  it("names the answer a person got wrong, so a screen can point at it", async () => {
    const save = vi.fn(async () => {
      throw new UnusableCategoryError("parent", "it is already a subcategory");
    });

    await expect(handleAddCategory(signedIn, hers, save, draft)).resolves.toEqual(
      { kind: "rejected", field: "parent" },
    );
  });

  it("keeps a dropped connection from being reported as a bad answer", async () => {
    const boom = new Error("the connection went away");
    const save = vi.fn(async () => {
      throw boom;
    });

    await expect(handleAddCategory(signedIn, hers, save, draft)).resolves.toEqual(
      { kind: "failed", cause: boom },
    );
  });
});

describe("what a refused Category says on the screen", () => {
  it("says something for every way it can be refused", () => {
    const refusals = [
      { kind: "not-signed-in" },
      { kind: "no-such-space" },
      { kind: "failed", cause: new Error("nope") },
      { kind: "rejected", field: "name" },
      { kind: "rejected", field: "parent" },
      { kind: "rejected", field: "space" },
    ] as const;

    for (const refusal of refusals) {
      expect(refusalMessage(refusal)).toMatch(/\S/);
    }
  });

  it("points at the field that was wrong rather than apologising in general", () => {
    expect(refusalMessage({ kind: "rejected", field: "name" })).not.toBe(
      refusalMessage({ kind: "rejected", field: "parent" }),
    );
  });
});
