import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MovementRow } from "./row";
import { calendarDate } from "@/domain/calendar/month";
import type { ReadableMovement } from "./month";

const movement = (changes: Partial<ReadableMovement> = {}): ReadableMovement => ({
  id: "movement-1",
  direction: "expense",
  category: "Supermercado",
  heading: "Comida",
  amount: "$128.400",
  minorUnits: 12840000,
  day: "Hoy",
  occurredOn: calendarDate("2026-09-05"),
  categoryId: "food.groceries",
  attributedTo: "member-1",
  mark: { kind: "icon", name: "cart", tint: "green" },
  whose: { name: "Gian Solo", colour: "first" },
  recordedBy: "member-1",
  ...changes,
});

const row = (changes: Partial<ReadableMovement> = {}) =>
  render(<MovementRow movement={movement(changes)} href="/espacios/s/m" />);

describe("a Movement, as a row on the month's list", () => {
  it("is a link to the Movement itself", () => {
    row();

    expect(screen.getByRole("link")).toHaveAttribute("href", "/espacios/s/m");
  });

  it("is named by its Category, with the heading it sits under beneath it", () => {
    row();

    expect(screen.getByText("Supermercado")).toBeInTheDocument();
    expect(screen.getByText("Comida")).toBeInTheDocument();
  });

  /*
   * Absent rather than empty: a Category that is a heading itself has nothing
   * to say on the second line, and a blank span still takes a line's worth of
   * height under the name.
   */
  it("keeps only its name where there is no heading above it", () => {
    const { container } = row({ category: "Transporte", heading: null });

    expect(container.textContent).not.toContain("·");
  });

  it("carries the mark its Category was given", () => {
    const { container } = row();

    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("carries a letter for a Category that has no icon", () => {
    row({
      category: "Ahorro",
      mark: { kind: "letter", letter: "A", tint: "grey" },
    });

    expect(screen.getByText("A")).toBeInTheDocument();
  });

  describe("whose money it was", () => {
    /*
     * A coloured circle and not the line of text it replaced. "Plata de Ana"
     * cost the row a whole line to say what an avatar says in no space at all
     * -- and the avatar is a labelled image, so the fact is still there for
     * anybody who cannot see the colour.
     */
    it("is a circle carrying the Member's whole name", () => {
      row();

      expect(
        screen.getByRole("img", { name: "Gian Solo" }),
      ).toBeInTheDocument();
      expect(screen.queryByText(/Plata de/)).not.toBeInTheDocument();
    });

    // In a Space of one every Movement is the reader's, so the circle would
    // say the same thing on every row -- which is a circle a thumb stops
    // seeing, bought with width the row has not got.
    it("is drawn on no row at all in a Space of one", () => {
      row({ whose: null });

      expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });
  });

  describe("the amount", () => {
    it("is written plainly when the money went out", () => {
      row();

      expect(screen.getByText("$128.400")).toBeInTheDocument();
    });

    /*
     * Signed AND coloured (#39). ADR-0016 refused the colour and this reopens
     * it: the reason it gave was that a difference carried by colour alone is
     * one somebody cannot see, and the "+" is still there -- it is read out by
     * a screen reader and survives a black-and-white printout. The colour is
     * what the canvas adds on top of the sign, not instead of it.
     */
    it("is signed when the money came in", () => {
      row({ direction: "income", category: "Ingreso", amount: "$5.000.000" });

      expect(screen.getByText("+$5.000.000")).toBeInTheDocument();
    });

    it("is coloured when the money came in, as well as signed", () => {
      render(
        <>
          <MovementRow movement={movement()} href="/a" />
          <MovementRow
            movement={movement({
              direction: "income",
              category: "Ingreso",
              amount: "$5.000.000",
            })}
            href="/b"
          />
        </>,
      );

      expect(screen.getByText("+$5.000.000").className).not.toBe(
        screen.getByText("$128.400").className,
      );
    });
  });
});
