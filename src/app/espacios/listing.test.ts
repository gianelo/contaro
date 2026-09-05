import { describe, expect, it } from "vitest";
import type { BudgetItem } from "@/domain/budget/budget";
import type { Movement } from "@/domain/movement/movement";
import type { SpaceWithMembers } from "@/domain/space/access";
import type { CurrencyCode } from "@/domain/money/currency";
import { calendarDate, month } from "@/domain/calendar/month";
import { money } from "@/domain/money/money";
import { readableSpaces } from "./listing";

const reader = {
  locales: ["es-CO"],
  today: calendarDate("2026-09-05"),
} as const;

const gian = { id: "member-1", name: "Gian Solo" };
const ana = { id: "member-2", name: "Ana Junta" };

const listed = (
  id: string,
  name: string,
  currency: CurrencyCode,
  members: readonly { id: string; name: string }[] = [gian],
): SpaceWithMembers => ({ space: { id, name, currency }, members });

const expense = (spaceId: string, amount: number, currency: CurrencyCode) =>
  ({
    id: `movement-${spaceId}-${amount}`,
    spaceId,
    direction: "expense",
    categoryId: "category-1",
    amount: money(amount, currency),
    occurredOn: calendarDate("2026-09-03"),
    recordedBy: gian.id,
    attributedTo: gian.id,
  }) satisfies Movement;

const planned = (spaceId: string, amount: number, currency: CurrencyCode) =>
  ({
    kind: "variable",
    id: `item-${spaceId}-${amount}`,
    spaceId,
    month: month("2026-09"),
    categoryId: "category-1",
    amount: money(amount, currency),
  }) satisfies BudgetItem;

const read = (
  spaces: readonly SpaceWithMembers[],
  movements: Record<string, readonly Movement[]> = {},
  items: Record<string, readonly BudgetItem[]> = {},
  lastOpened: string | null = null,
) =>
  readableSpaces(
    spaces,
    new Map(Object.entries(movements)),
    new Map(Object.entries(items)),
    lastOpened,
    reader,
  );

describe("the Spaces a Member chooses from", () => {
  it("keeps the order it is handed, so no row moves under a thumb", () => {
    const cards = read([
      listed("space-1", "Casa", "COP"),
      listed("space-2", "Viaje", "USD"),
    ]);

    expect(cards.map((card) => card.name)).toEqual(["Casa", "Viaje"]);
  });

  /*
   * Story 5 of #1: what the month has cost against what it was planned to,
   * before opening anything.
   */
  it("says what each month cost against what it was planned to", () => {
    const [card] = read(
      [listed("space-1", "Casa", "COP")],
      // COP counts in whole pesos: no minor units, so these are the figures
      // the canvas draws, written straight (ADR-0007).
      { "space-1": [expense("space-1", 3_994_900, "COP")] },
      { "space-1": [planned("space-1", 4_603_900, "COP")] },
    );

    expect(card?.spent).toContain("3.994.900");
    expect(card?.expected).toContain("4.603.900");
  });

  /*
   * The acceptance criterion that a blank would fail: a Space nobody has
   * planned a month for still owes a figure, and zero is one. The currency is
   * the Space's even when there is not a single row to read it off (ADR-0001).
   */
  it("shows an honest zero for a Space with no plan yet", () => {
    const [card] = read([listed("space-1", "Casa", "COP")]);

    expect(card?.expected).toContain("0");
    expect(card?.spent).toContain("0");
  });

  /*
   * The real risk of reading many Spaces at once: one Space's money landing
   * on another's card. Two Spaces, two currencies, one shared month.
   */
  it("never lets one Space's money reach another's card", () => {
    const [casa, viaje] = read(
      [listed("space-1", "Casa", "COP"), listed("space-2", "Viaje", "USD")],
      {
        "space-1": [expense("space-1", 100_000, "COP")],
        // Two decimal places to the peso's none: if either figure ever reached
        // the other card it would be written in the wrong money as well as be
        // the wrong number.
        "space-2": [expense("space-2", 25_00, "USD")],
      },
    );

    expect(casa?.spent).toContain("100.000");
    expect(casa?.spent).not.toContain("25");
    expect(viaje?.spent).toContain("25");
    expect(viaje?.spent).not.toContain("100.000");
  });

  it("writes each figure in its own Space's money and never the reader's", () => {
    const [casa, viaje] = read([
      listed("space-1", "Casa", "COP"),
      listed("space-2", "Viaje", "USD"),
    ]);

    // Written by the same reader, in two different currencies: the separators
    // are theirs and the money never is.
    expect(casa?.spent).not.toBe(viaje?.spent);
  });

  describe("who is in a Space", () => {
    it("says a Space of one belongs to whoever is reading it", () => {
      const [card] = read([listed("space-1", "Casa", "COP", [gian])]);

      expect(card?.who).toBe("Solo vos · COP");
    });

    it("counts the Members of a shared Space, and names its money", () => {
      const [card] = read([listed("space-1", "Casa", "COP", [gian, ana])]);

      expect(card?.who).toBe("2 miembros · COP");
    });

    it("hands the card everyone in it, so it can draw them", () => {
      const [card] = read([listed("space-1", "Casa", "COP", [gian, ana])]);

      expect(card?.members).toEqual([gian, ana]);
    });
  });

  describe("the Space being used", () => {
    it("marks the one last opened, and only that one", () => {
      const cards = read(
        [listed("space-1", "Casa", "COP"), listed("space-2", "Viaje", "USD")],
        {},
        {},
        "space-2",
      );

      expect(cards.map((card) => card.lastOpened)).toEqual([false, true]);
    });

    // Somebody who has never opened one has no Space being used, and a badge
    // guessed onto the first card would be a statement nothing supports.
    it("marks none at all where none has been opened", () => {
      const cards = read([
        listed("space-1", "Casa", "COP"),
        listed("space-2", "Viaje", "USD"),
      ]);

      expect(cards.every((card) => !card.lastOpened)).toBe(true);
    });

    // A Space opened and then left is a Space the list no longer shows. The
    // id outliving it must not quietly mark nothing, or worse, something else.
    it("marks nothing when the Space last opened is no longer theirs", () => {
      const cards = read(
        [listed("space-1", "Casa", "COP")],
        {},
        {},
        "space-gone",
      );

      expect(cards.every((card) => !card.lastOpened)).toBe(true);
    });
  });
});
