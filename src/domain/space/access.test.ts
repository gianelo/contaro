import { describe, expect, it } from "vitest";
import { spaceVisibleTo, spacesVisibleTo } from "./access";

const ana = "3f2b0c1e-0000-4000-8000-000000000001";
const beto = "3f2b0c1e-0000-4000-8000-000000000002";

const casa = {
  id: "3f2b0c1e-0000-4000-8000-0000000000ca",
  name: "Casa",
  currency: "ARS",
} as const;

const viaje = {
  id: "3f2b0c1e-0000-4000-8000-0000000000a1",
  name: "Viaje",
  currency: "USD",
} as const;

const anaEnCasa = { id: ana, name: "Ana Gómez" };
const betoEnCasa = { id: beto, name: "Beto Pérez" };

describe("who may open a Space", () => {
  it("is a Member of it", () => {
    expect(spaceVisibleTo(ana, casa, [ana, beto])).toEqual(casa);
  });

  it("is not someone who is not in it, however they came by its identifier", () => {
    expect(spaceVisibleTo(beto, casa, [ana])).toBeNull();
  });

  it("is nobody, when the Space has no Members at all", () => {
    expect(spaceVisibleTo(ana, casa, [])).toBeNull();
  });
});

describe("which Spaces a Member sees", () => {
  it("is exactly the ones they are in, in the order they were given", () => {
    const hers = [
      { space: casa, members: [anaEnCasa, betoEnCasa] },
      { space: viaje, members: [anaEnCasa] },
    ];

    expect(spacesVisibleTo(ana, hers)).toEqual(hers);
  });

  it("drops a Space they are not in, however it got into the list", () => {
    const mine = { space: viaje, members: [anaEnCasa] };

    expect(
      spacesVisibleTo(ana, [{ space: casa, members: [betoEnCasa] }, mine]),
    ).toEqual([mine]);
  });

  it("is nothing at all for a Member who is in none of them", () => {
    expect(
      spacesVisibleTo(beto, [{ space: viaje, members: [anaEnCasa] }]),
    ).toEqual([]);
  });

  it("keeps every Member on the row, so it can name the other one", () => {
    const [row] = spacesVisibleTo(ana, [
      { space: casa, members: [anaEnCasa, betoEnCasa] },
    ]);

    // The row exists to tell the shared Space from the personal one at a
    // glance, which it cannot do while it only names the person reading it.
    expect(row?.members).toEqual([anaEnCasa, betoEnCasa]);
  });
});
