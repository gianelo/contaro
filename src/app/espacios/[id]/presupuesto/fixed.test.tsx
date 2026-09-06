import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { hitTarget } from "@/ui/hit-target";
import { FixedItems } from "./fixed";
import type { ReadableFixedItem } from "./budget";

// The action is a "use server" module, which a jsdom run cannot import. What
// this file is about is the section and its confirmation; that the action
// records a Movement is proved where the store is, against a real database.
vi.mock("./actions", () => ({
  payFixedItemAction: async () => ({ error: null }),
}));

const item = (changes: Partial<ReadableFixedItem> = {}): ReadableFixedItem => ({
  id: "fixed-1",
  name: "Arriendo",
  category: "Vivienda",
  beneath: "Vivienda · 1 sept",
  amount: "$1.800.000",
  paid: false,
  due: null,
  ...changes,
});

const section = (items: readonly ReadableFixedItem[]) => (
  <FixedItems
    spaceId="space-casa"
    month="2026-09"
    items={items}
    spaceName="Compartido con Ana"
    memberName="Gian"
  />
);

describe("the Fijos section", () => {
  it("names each item and writes what it costs", () => {
    render(section([item()]));

    expect(screen.getByText("Arriendo")).toBeInTheDocument();
    expect(screen.getByText("$1.800.000")).toBeInTheDocument();
    expect(screen.getByText("Vivienda · 1 sept")).toBeInTheDocument();
  });

  // The badge is words and never a colour on its own: somebody who cannot
  // tell the accent ground from the muted one still reads which it is.
  it("says in words whether an item is pending or paid", () => {
    render(section([item(), item({ id: "fixed-2", name: "Netflix", paid: true })]));

    expect(screen.getByText("Pendiente")).toBeInTheDocument();
    expect(screen.getByText("Pagado")).toBeInTheDocument();
  });

  // The whole of "an item falling due soon says so in words, not only in a
  // colour" (#13). The amber is the second way of saying it.
  it("says an item is near its day in words", () => {
    render(section([item({ due: "vence en 4 días" })]));

    expect(screen.getByText(/vence en 4 días/)).toHaveTextContent(
      "Vivienda · 1 sept · vence en 4 días",
    );
  });

  it("has no section at all in a month with no Fixed items", () => {
    const { container } = render(section([]));

    expect(container).toBeEmptyDOMElement();
  });

  describe("marking one paid", () => {
    it("confirms first, naming what will be created", async () => {
      render(section([item()]));

      await userEvent.click(screen.getByRole("button", { name: /Arriendo/ }));

      const sheet = screen.getByRole("dialog");
      expect(sheet).toHaveAccessibleName("¿Marcar Arriendo como pagado?");
      expect(sheet).toHaveTextContent(
        "Se va a crear un gasto de $1.800.000 con fecha de hoy, en la categoría Vivienda.",
      );
    });

    // The one figure a person is confirming, lifted out of the sentence's
    // grey the way the canvas draws it.
    it("writes the amount in the ordinary ink, not the sentence's grey", async () => {
      render(section([item()]));

      await userEvent.click(screen.getByRole("button", { name: /Arriendo/ }));

      // Scoped to the sheet: the row behind it writes the same figure, and
      // that one is the row's own amount rather than the one being confirmed.
      const { getByText } = within(screen.getByRole("dialog"));
      expect(getByText("$1.800.000").tagName).toBe("STRONG");
    });

    // The recap is the point of the confirmation: it says which Space the
    // money lands in and whose it will be, which are exactly the two things a
    // stray tap would get wrong.
    it("names the Space, who is recording and who it is attributed to", async () => {
      render(section([item()]));

      await userEvent.click(screen.getByRole("button", { name: /Arriendo/ }));

      const sheet = screen.getByRole("dialog");
      expect(sheet).toHaveTextContent("EspacioCompartido con Ana");
      expect(sheet).toHaveTextContent("Registrado porGian");
      expect(sheet).toHaveTextContent("Atribuido aGian");
    });

    it("creates nothing until the confirmation is answered", async () => {
      render(section([item()]));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: /Arriendo/ }));
      await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    // A paid item has nothing left to pay. A control that opened a sheet only
    // to refuse would be a control that exists to say no.
    it("offers nothing to pay on an item that is already paid", () => {
      render(section([item({ paid: true })]));

      expect(
        screen.queryByRole("button", { name: /Arriendo/ }),
      ).not.toBeInTheDocument();
    });
  });

  // What the artboard draws at the end of a Fijos row: one column, the amount
  // over its badge, flush right. It went missing when the badge moved beside
  // the row (#48) and left the amount behind inside it, which put three things
  // on one line and squeezed the name until it wrapped.
  describe("the end of a row", () => {
    it("stacks the amount over the badge, in one block", () => {
      render(section([item()]));

      const amount = screen.getByText("$1.800.000");
      const badge = screen.getByText("Pendiente");

      expect(amount.parentElement).toContainElement(badge);
    });

    // The whole column and not only its lower half. A control inside a link is
    // not a control a keyboard or a screen reader can reach, so the badge has
    // to sit outside the row -- and the amount above it goes with it, because
    // the two are one column and a column does not straddle the link.
    it("keeps the whole column outside the row's own tap", () => {
      render(section([item()]));

      const link = screen.getByRole("link", { name: /Arriendo/ });

      expect(link).not.toContainElement(screen.getByText("$1.800.000"));
      expect(link).not.toContainElement(screen.getByText("Pendiente"));
    });

    it("stacks the same way once the item is paid", () => {
      render(section([item({ paid: true })]));

      const amount = screen.getByText("$1.800.000");

      expect(amount.parentElement).toContainElement(screen.getByText("Pagado"));
    });

    // The badge is smaller than a finger, so the tap is not the badge: it is
    // the whole column, the amount included. That the column really is 44px is
    // hit-target.module.css's business, and the geometry it produces is
    // measured in a browser by e2e/budget.spec.ts.
    it("makes the whole column the tap, and gives it a touch's worth of room", () => {
      render(section([item()]));

      const tap = screen.getByRole("button", {
        name: "Marcar Arriendo como pagado",
      });

      expect(tap).toContainElement(screen.getByText("$1.800.000"));
      expect(tap).toContainElement(screen.getByText("Pendiente"));
      expect(tap).toHaveClass(hitTarget);
    });

    // And a paid row's column is a reading and not a control: there is nothing
    // left to pay, and a tap that opened a sheet only to refuse is a tap that
    // exists to say no.
    it("leaves a paid row's column with nothing to tap", () => {
      render(section([item({ paid: true })]));

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });

  describe("reaching the item itself", () => {
    // Every row of the plan opens its item, the way a Variable row already
    // did (#48). The pay tap is beside the row rather than instead of it: two
    // things to do to one line, and a row that was only one of them left the
    // other with nowhere to live.
    it("opens the item behind every row", () => {
      render(section([item()]));

      expect(screen.getByRole("link", { name: /Arriendo/ })).toHaveAttribute(
        "href",
        "/espacios/space-casa/presupuesto/fixed-1",
      );
    });

    // And the paid row most of all: it is the one with nothing else to do,
    // and until now it was inert.
    it("opens a paid item too", () => {
      render(section([item({ paid: true })]));

      expect(screen.getByRole("link", { name: /Arriendo/ })).toHaveAttribute(
        "href",
        "/espacios/space-casa/presupuesto/fixed-1",
      );
    });

    // Marking paid keeps its own control, and it says what it does rather
    // than reading as the state it would leave behind.
    it("names the pay control by what tapping it does", () => {
      render(section([item()]));

      expect(
        screen.getByRole("button", { name: "Marcar Arriendo como pagado" }),
      ).toBeInTheDocument();
    });
  });
});
