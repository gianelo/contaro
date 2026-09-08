import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { isCalendarDate, type CalendarDate } from "@/domain/calendar/month";
import { nothingWrongYet } from "./record";
import { MAX_MOVEMENT_NAME_LENGTH } from "@/domain/movement/movement";
import { MovementForm, type MovementFormProps } from "./form";

/** A day the domain agrees is one, so the fixture states a real date. */
const on = (day: string): CalendarDate => {
  if (!isCalendarDate(day)) throw new Error(`${day} is not a day.`);
  return day;
};

const today = on("2026-09-04");

const props = {
  spaceId: "s-1",
  categories: [
    { value: "c-comida", label: "Comida", children: [] },
    { value: "c-super", label: "Súper", children: [] },
  ],
  members: [{ value: "m-gian", label: "Gian" }],
  currency: "ARS",
  locales: ["es-AR"],
  serverDay: today,
  initial: {
    amount: 0,
    direction: "expense",
    categoryId: "",
    occurredOn: today,
    attributedTo: "m-gian",
    name: null,
  },
  action: async () => nothingWrongYet,
  submit: "Guardar",
  working: "Guardando…",
  closedMonths: [],
} satisfies MovementFormProps;

/**
 * Where one block sits relative to another, read off the document rather than
 * off the source. `compareDocumentPosition` answers about the rendered tree,
 * so a block moved inside a component it is nested in is still caught.
 */
const comesBefore = (first: Element, second: Element) =>
  Boolean(
    first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING,
  );

/**
 * The order the blocks come down the screen, pinned (#52).
 *
 * `entry.source.test.ts` pins this screen's numbers against the artboard and
 * pins no order at all, which is how #37 shipped ten green criteria with two
 * blocks in the wrong place. The order is the part of a canvas that a
 * stylesheet cannot hold, so it is held here.
 */
describe("the order the entry screen comes down in", () => {
  it("draws the blocks in the order the canvas draws them", () => {
    render(<MovementForm {...props} />);

    const blocks = [
      // What kind of movement this is, above the figure: it decides whether
      // there is a Category to ask about at all.
      { block: "the direction", drawn: screen.getByRole("radiogroup", { name: "Qué anotás" }) },
      // The figure, read where it is typed rather than at the foot.
      { block: "the figure", drawn: screen.getByRole("status") },
      // The day and who the money belongs to, stated in one line.
      { block: "the day line", drawn: screen.getByRole("button", { name: "Cambiar cuándo y de quién" }) },
      { block: "the Category", drawn: screen.getByRole("group", { name: "Categoría" }) },
      // What it was, under the Category: the finer grain of the same question
      // the chips answer, so the two read as one thing narrowing (#66).
      { block: "what it was", drawn: screen.getByRole("textbox", { name: "Qué fue" }) },
      // The keys after the chips, where the canvas puts them.
      { block: "the keys", drawn: screen.getByRole("group", { name: "Teclado del monto" }) },
      { block: "Save", drawn: screen.getByRole("button", { name: "Guardar" }) },
    ];

    blocks.reduce((above, below) => {
      expect(
        comesBefore(above.drawn, below.drawn),
        `${above.block} is drawn after ${below.block}`,
      ).toBe(true);
      return below;
    });
  });

  it("keeps the currency under the figure rather than with the keys", () => {
    // The two halves of the readout are one block on the canvas, 2px apart.
    // Splitting the keypad is what could have sent the currency to the foot
    // with the keys, so it is named here rather than left to the eye.
    render(<MovementForm {...props} />);

    expect(
      comesBefore(
        screen.getByRole("status"),
        screen.getByRole("button", { name: "Cambiar cuándo y de quién" }),
      ),
    ).toBe(true);
    expect(
      comesBefore(
        screen.getByText("ARS"),
        screen.getByRole("button", { name: "Cambiar cuándo y de quién" }),
      ),
    ).toBe(true);
  });

  it("still announces the figure as it changes, and still names the keys", () => {
    // The two accessibility facts the split could have dropped on the floor:
    // the live region belongs to the readout and the group label to the keys,
    // and they are now in two different components.
    render(<MovementForm {...props} />);

    const figure = screen.getByRole("status");

    expect(figure).toHaveAttribute("aria-live", "polite");
    expect(
      screen.getByRole("group", { name: "Teclado del monto" }),
    ).not.toContainElement(figure);
  });
});

describe("saying what a Movement was", () => {
  it("offers a place to say it", () => {
    render(<MovementForm {...props} />);

    expect(screen.getByRole("textbox", { name: "Qué fue" })).toBeInTheDocument();
  });

  it("asks for nothing: the field is empty and optional", () => {
    // #66's second acceptance criterion, and story 18 in #1: recording an
    // expense is still a keypad, a tap and Guardar for somebody standing at a
    // till who does not want to name it.
    render(<MovementForm {...props} />);

    const field = screen.getByRole("textbox", { name: "Qué fue" });

    expect(field).toHaveValue("");
    expect(field).not.toBeRequired();
  });

  it("stops a name at the domain's ceiling rather than after a round trip", () => {
    render(<MovementForm {...props} />);

    expect(screen.getByRole("textbox", { name: "Qué fue" })).toHaveAttribute(
      "maxlength",
      String(MAX_MOVEMENT_NAME_LENGTH),
    );
  });

  it("opens on the name a Movement already has, so leaving it alone keeps it", () => {
    render(
      <MovementForm
        {...props}
        initial={{ ...props.initial, name: "Éxito" }}
      />,
    );

    expect(screen.getByRole("textbox", { name: "Qué fue" })).toHaveValue("Éxito");
  });

  /*
   * #119, decision 16: "no greying, no disabling". A closed month never
   * reaches this button, because `When` refuses the day rather than letting it
   * through to be refused here.
   */
  it("leaves Save alone in a Space with closed months", () => {
    render(
      <MovementForm
        {...props}
        initial={{ ...props.initial, amount: 1500 }}
        closedMonths={["2026-08"]}
      />,
    );

    expect(screen.getByRole("button", { name: "Guardar" })).toBeEnabled();
  });
});
