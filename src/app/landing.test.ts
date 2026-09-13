import { describe, expect, it } from "vitest";
import { whereToLand } from "./landing";

const casa = "space-casa";
const viaje = "space-viaje";

describe("where a Member lands", () => {
  it("is the Space they opened last", () => {
    expect(
      whereToLand({
        spaceIds: [casa, viaje],
        lastOpenedId: viaje,
        invitationsWaiting: 0,
      }),
    ).toEqual({ kind: "space", id: viaje });
  });

  it("is the only Space there is, for somebody who has never opened one", () => {
    expect(
      whereToLand({
        spaceIds: [casa],
        lastOpenedId: null,
        invitationsWaiting: 0,
      }),
    ).toEqual({ kind: "space", id: casa });
  });

  it("is the list, where there are several and none has been opened", () => {
    expect(
      whereToLand({
        spaceIds: [casa, viaje],
        lastOpenedId: null,
        invitationsWaiting: 0,
      }),
    ).toEqual({ kind: "list" });
  });

  it("is the list, for somebody who has no Space at all", () => {
    expect(
      whereToLand({ spaceIds: [], lastOpenedId: null, invitationsWaiting: 0 }),
    ).toEqual({ kind: "list" });
  });

  it("is the list when a Space last opened is no longer theirs", () => {
    expect(
      whereToLand({
        spaceIds: [casa, viaje],
        lastOpenedId: "space-they-left",
        invitationsWaiting: 0,
      }),
    ).toEqual({ kind: "list" });
  });

  it("falls back to the only Space left when the one last opened is not", () => {
    expect(
      whereToLand({
        spaceIds: [casa],
        lastOpenedId: "space-they-left",
        invitationsWaiting: 0,
      }),
    ).toEqual({ kind: "space", id: casa });
  });

  it("is the list while an Invitation is waiting, whatever else is true", () => {
    expect(
      whereToLand({
        spaceIds: [casa],
        lastOpenedId: casa,
        invitationsWaiting: 1,
      }),
    ).toEqual({ kind: "list" });
  });
});
