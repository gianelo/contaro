import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MAX_MOVEMENT_AMOUNT } from "@/domain/movement/movement";
import { Keypad, nextAmount } from "./keypad";

describe("what a thumb on the keypad does to the amount", () => {
  it("starts from nothing", () => {
    expect(nextAmount(0, "1")).toBe(1);
  });

  it("pushes each number in from the right, the way a till does", () => {
    // 1, 2, 8, 4, 0, 0 is $1.284,00 in a currency with centavos, and it is
    // typed in the order the digits are said out loud.
    const typed = (["1", "2", "8", "4", "0", "0"] as const).reduce<number>(
      nextAmount,
      0,
    );

    expect(typed).toBe(128_400);
  });

  it("takes three noughts at once, for the amounts that have them", () => {
    expect(nextAmount(128, "000")).toBe(128_000);
  });

  it("stays at nothing when a nought is the first thing pressed", () => {
    // A leading nought means nothing and reads as if something happened.
    expect(nextAmount(0, "0")).toBe(0);
    expect(nextAmount(0, "000")).toBe(0);
  });

  it("takes the last number back off", () => {
    expect(nextAmount(128_400, "erase")).toBe(12_840);
  });

  it("has nothing left to take back off an empty amount", () => {
    expect(nextAmount(0, "erase")).toBe(0);
  });

  it("refuses a number that would push the amount past what is recordable", () => {
    // Held here as well as in the domain, so a thumb resting on a key stops at
    // the ceiling rather than silently rolling the figure over.
    expect(nextAmount(MAX_MOVEMENT_AMOUNT, "9")).toBe(MAX_MOVEMENT_AMOUNT);
    expect(nextAmount(MAX_MOVEMENT_AMOUNT, "000")).toBe(MAX_MOVEMENT_AMOUNT);
  });
});

describe("the keypad on the screen", () => {
  it("shows the amount as the money it is, in the reader's own separators", () => {
    render(
      <Keypad value={128_400} currency="ARS" locales={["es-AR"]} onChange={vi.fn()} />,
    );

    // ADR-0014: the separators are the reader's, the currency is the Space's.
    expect(screen.getByRole("status")).toHaveTextContent("1.284,00");
  });

  it("shows the same amount the way somebody else reads numbers", () => {
    render(
      <Keypad value={128_400} currency="ARS" locales={["en-US"]} onChange={vi.fn()} />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("1,284.00");
  });

  it("hands back what the amount becomes when a number is pressed", async () => {
    const onChange = vi.fn();
    render(<Keypad value={12} currency="ARS" locales={["es-AR"]} onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: "7" }));

    expect(onChange).toHaveBeenCalledWith(127);
  });

  it("hands back the amount with its last number gone", async () => {
    const onChange = vi.fn();
    render(
      <Keypad value={127} currency="ARS" locales={["es-AR"]} onChange={onChange} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Borrar el último número" }));

    expect(onChange).toHaveBeenCalledWith(12);
  });

  it("offers every number a person needs and nothing else", () => {
    render(<Keypad value={0} currency="ARS" locales={["es-AR"]} onChange={vi.fn()} />);

    for (const key of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "000", "0"]) {
      expect(screen.getByRole("button", { name: key })).toBeInTheDocument();
    }
  });

  it("gives every key a touch target a thumb can hit", () => {
    render(<Keypad value={0} currency="ARS" locales={["es-AR"]} onChange={vi.fn()} />);

    // The class is what carries the 44px; that it is really 44px is measured
    // in a browser by e2e/hit-targets.spec.ts.
    for (const key of screen.getAllByRole("button")) {
      expect(key.className).toMatch(/hitTarget/);
    }
  });
});
