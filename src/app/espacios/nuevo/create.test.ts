import { describe, expect, it, vi } from "vitest";
import { createSpace, type NewSpace } from "@/domain/space/space";
import {
  handleCreateSpace,
  refusalMessage,
  type SaveSpace,
} from "./create";

const ana = "3f2b0c1e-0000-4000-8000-000000000001";

const noSession = async () => null;
const sessionFor = (memberId: string) => async () => ({ memberId });

/**
 * A store that behaves exactly as the database does: it hands the draft to the
 * domain and writes down whatever comes back. Injecting a finished Space
 * instead would prove only that this handler can return one.
 */
const store = () => {
  const saved: { creatorId: string; space: NewSpace; memberIds: readonly string[] }[] = [];

  const saveSpace: SaveSpace = async (creatorId, draft) => {
    const { space, memberIds } = createSpace(draft, creatorId);
    saved.push({ creatorId, space, memberIds });
    return { id: `space-${saved.length}`, ...space };
  };

  return { saved, saveSpace };
};

describe("creating a Space", () => {
  it("refuses a request that carries no session", async () => {
    const { saved, saveSpace } = store();

    const outcome = await handleCreateSpace(noSession, saveSpace, {
      name: "Casa",
      currency: "ARS",
    });

    expect(outcome).toEqual({ kind: "not-signed-in" });
    expect(saved).toEqual([]);
  });

  it("creates the Space the form asked for", async () => {
    const { saveSpace } = store();

    const outcome = await handleCreateSpace(sessionFor(ana), saveSpace, {
      name: "Casa",
      currency: "ARS",
    });

    expect(outcome).toEqual({
      kind: "created",
      space: { id: "space-1", name: "Casa", currency: "ARS" },
    });
  });

  it("makes the signed-in Member the creator, whatever the form says", async () => {
    const { saved, saveSpace } = store();

    await handleCreateSpace(sessionFor(ana), saveSpace, {
      name: "Casa",
      currency: "ARS",
    });

    expect(saved[0]?.creatorId).toBe(ana);
    expect(saved[0]?.memberIds).toEqual([ana]);
  });

  it("refuses a Space with no name, and says which answer was the bad one", async () => {
    const { saved, saveSpace } = store();

    const outcome = await handleCreateSpace(sessionFor(ana), saveSpace, {
      name: "   ",
      currency: "ARS",
    });

    expect(outcome).toEqual({ kind: "rejected", field: "name" });
    expect(saved).toEqual([]);
  });

  it("refuses a currency contaro does not offer", async () => {
    const { saveSpace } = store();

    const outcome = await handleCreateSpace(sessionFor(ana), saveSpace, {
      name: "Casa",
      currency: "XYZ",
    });

    expect(outcome).toEqual({ kind: "rejected", field: "currency" });
  });

  it("refuses a form that names no currency at all", async () => {
    const { saved, saveSpace } = store();

    // What the picker really posts when nobody chooses: the unchosen option
    // carries no value (ADR-0012), so this is the empty string and not "ARS".
    const outcome = await handleCreateSpace(sessionFor(ana), saveSpace, {
      name: "Casa",
      currency: "",
    });

    expect(outcome).toEqual({ kind: "rejected", field: "currency" });
    expect(saved).toEqual([]);
  });

  it("does not treat a database that fell over as a bad answer from the person", async () => {
    const gone = new Error("the connection went away");
    const saveSpace = vi.fn(async () => {
      throw gone;
    });

    const outcome = await handleCreateSpace(sessionFor(ana), saveSpace, {
      name: "Casa",
      currency: "ARS",
    });

    // Kept whole rather than swallowed, so the caller can write it down: a
    // failure nobody records is a failure nobody ever fixes.
    expect(outcome).toEqual({ kind: "failed", cause: gone });
  });
});

describe("what a refused creation says", () => {
  it("names the field the person can fix", () => {
    expect(refusalMessage({ kind: "rejected", field: "name" })).toMatch(/nombre/i);
    expect(refusalMessage({ kind: "rejected", field: "currency" })).toMatch(
      /moneda/i,
    );
  });

  it("does not blame the form for a session that ended", () => {
    expect(refusalMessage({ kind: "not-signed-in" })).toMatch(/sesión/i);
    expect(refusalMessage({ kind: "rejected", field: "creator" })).toMatch(
      /sesión/i,
    );
  });

  it("does not blame the person for a failure that was ours", () => {
    const message = refusalMessage({ kind: "failed", cause: new Error("boom") });

    expect(message).toMatch(/de nuevo/i);
    expect(message).not.toContain("boom");
  });
});
