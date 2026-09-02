import { describe, expect, it, vi } from "vitest";
import { handleMeRequest } from "./handler";

const ana = {
  id: "3f2b0c1e-0000-4000-8000-000000000001",
  googleSubject: "108422119955512345678",
  email: "ana@example.com",
  name: "Ana",
};

const noSession = async () => null;
const sessionFor = (id: string) => async () => ({ memberId: id });
const membersById = (...known: (typeof ana)[]) => {
  return async (id: string) => known.find((m) => m.id === id) ?? null;
};

describe("GET /api/me", () => {
  it("refuses a request that carries no session", async () => {
    const response = await handleMeRequest(noSession, membersById(ana));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "not_signed_in" });
  });

  it("answers with the Member the session belongs to", async () => {
    const response = await handleMeRequest(
      sessionFor(ana.id),
      membersById(ana),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ id: ana.id, name: "Ana" });
  });

  it("looks the Member up by the id its own session carries", async () => {
    const findMember = vi.fn(membersById(ana));

    await handleMeRequest(sessionFor(ana.id), findMember);

    expect(findMember).toHaveBeenCalledWith(ana.id);
  });

  it("does not hand back a Member the session did not name", async () => {
    const beto = { ...ana, id: "3f2b0c1e-0000-4000-8000-000000000002" };

    const response = await handleMeRequest(
      sessionFor("3f2b0c1e-0000-4000-8000-00000000dead"),
      membersById(ana, beto),
    );

    expect(response.status).toBe(401);
  });

  it("says a session outlived its Member, rather than calling it signed out", async () => {
    const response = await handleMeRequest(sessionFor(ana.id), membersById());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "unknown_member" });
  });

  it("does not put the Google account id on the wire", async () => {
    const response = await handleMeRequest(
      sessionFor(ana.id),
      membersById(ana),
    );

    expect(await response.text()).not.toContain(ana.googleSubject);
  });
});
