import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MonthPill, type MonthChoice } from "./month-pill";

const choice = (
  month: string,
  label: string,
  inView = false,
): MonthChoice => ({ month, label, href: `?mes=${month}`, inView });

const CHOICES: readonly MonthChoice[] = [
  choice("2026-08", "Agosto"),
  choice("2026-09", "Septiembre", true),
  choice("2026-10", "Octubre"),
  choice("2026-11", "Noviembre"),
];

describe("the month at the top of a Space's screen", () => {
  it("writes the month being read", () => {
    render(<MonthPill label="Septiembre" choices={CHOICES} />);

    expect(screen.getByRole("button")).toHaveTextContent("Septiembre");
  });

  /*
   * The visible word first, the way `When`'s "Cambiar" is named: somebody
   * driving this screen by voice says what they can see, and somebody hearing
   * it still learns that the month is a control and not a heading.
   */
  it("is named for the month it shows and for what it does", () => {
    render(<MonthPill label="Septiembre" choices={CHOICES} />);

    expect(
      screen.getByRole("button", { name: /^Septiembre/ }),
    ).toBeInTheDocument();
  });

  // Shut, the months are not on the screen at all: the head of the screen is
  // a title and one control, not a title and a list of fourteen links.
  it("offers nothing until it is opened", () => {
    render(<MonthPill label="Septiembre" choices={CHOICES} />);

    expect(screen.queryByRole("link", { name: "Octubre" })).toBeNull();
  });

  /*
   * The whole reason the pill replaced the `‹ Septiembre ›` walker (#40):
   * every month it offers is one tap away, where walking to March from
   * September was six taps and six screens nobody wanted to look at.
   */
  it("offers every month in one tap once it is open", async () => {
    render(<MonthPill label="Septiembre" choices={CHOICES} />);

    await userEvent.click(screen.getByRole("button"));

    expect(screen.getByRole("link", { name: /Agosto/ })).toHaveAttribute(
      "href",
      "?mes=2026-08",
    );
    expect(screen.getByRole("link", { name: /Noviembre/ })).toHaveAttribute(
      "href",
      "?mes=2026-11",
    );
  });

  /*
   * Forwards as well as back, which is what a plan needs and a ledger does not
   * (ADR-0019): the month after this one is exactly the month somebody plans
   * on the 28th.
   */
  it("reaches a month that has not started", async () => {
    render(<MonthPill label="Septiembre" choices={CHOICES} />);

    await userEvent.click(screen.getByRole("button"));

    expect(screen.getByRole("link", { name: /Octubre/ })).toHaveAttribute(
      "href",
      "?mes=2026-10",
    );
  });

  /*
   * Picking a month is a client-side navigation, which leaves this component
   * mounted: without closing itself the sheet would still be open, and
   * covering the whole screen, on the month it had just opened.
   */
  it("shuts itself as a month is chosen", async () => {
    render(<MonthPill label="Septiembre" choices={CHOICES} />);

    await userEvent.click(screen.getByRole("button"));
    await userEvent.click(screen.getByRole("link", { name: /Octubre/ }));

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  /*
   * Which one you are on, said in words and not only in ink. A list of
   * fourteen months where the current one is merely a different grey is a list
   * somebody has to count their way through.
   */
  it("says which month is the one being read", async () => {
    render(<MonthPill label="Septiembre" choices={CHOICES} />);

    await userEvent.click(screen.getByRole("button"));

    expect(
      // Loose about the space between the two, which the accessible-name
      // computation in jsdom does not insert and a screen reader does.
      screen.getByRole("link", { name: /^Septiembre\s*Mes que estás viendo$/ }),
    ).toBeInTheDocument();
  });
});
