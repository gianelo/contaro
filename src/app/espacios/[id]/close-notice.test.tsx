import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CloseNotice } from "./close-notice";
import type { AnnouncedClose } from "./waiting";

// The action is a "use server" module, which a jsdom run cannot import. What
// this file is about is when the sheet appears and what each Member is shown;
// that the action closes a month is proved where the rows are.
vi.mock("./actions", () => ({
  closeMonthAction: async () => ({ error: null }),
}));

const waiting = (changes: Partial<AnnouncedClose> = {}): AnnouncedClose => ({
  month: "2026-09" as AnnouncedClose["month"],
  name: "septiembre",
  nextName: "octubre",
  waitingOn: null,
  announces: false,
  tally: { movements: 48, unpaid: 2 },
  ...changes,
});

const notice = (changes: Partial<AnnouncedClose> = {}) => (
  <CloseNotice spaceId="space-casa" waiting={waiting(changes)} />
);

const sheet = () => screen.queryByRole("dialog", { name: /Cerrar septiembre/ });

describe("the row that stays until the month is closed", () => {
  it("says the month ended and how to finish it", () => {
    render(notice());

    expect(
      screen.getByText(/septiembre terminó\. Cuando no le falte nada/i),
    ).toBeInTheDocument();
  });

  it("offers the act to the Space's creator", async () => {
    render(notice());

    await userEvent.click(
      screen.getByRole("button", { name: "Cerrar septiembre" }),
    );

    expect(sheet()).toBeInTheDocument();
  });
});

/*
 * Decision 14 of #109, and the first capability asymmetry in the product: the
 * invited Member is told the month is waiting and on whom, and is never shown
 * a button they cannot press.
 */
describe("what the invited Member sees", () => {
  const theirs = { waitingOn: "Gian", announces: false };

  it("states the fact and names who it is waiting on", () => {
    render(notice(theirs));

    expect(
      screen.getByText("septiembre terminó y espera que Gian lo cierre."),
    ).toBeInTheDocument();
  });

  it("offers no tap at all", () => {
    render(notice(theirs));

    expect(
      screen.queryByRole("button", { name: "Cerrar septiembre" }),
    ).not.toBeInTheDocument();
  });

  // Not a disabled button either: a disabled control answers "why not" with
  // nothing, and the sentence above it already answered by name.
  it("draws no sheet it could never open", () => {
    render(notice({ ...theirs, announces: true }));

    expect(sheet()).not.toBeInTheDocument();
  });
});

describe("the sheet that opens by itself", () => {
  /*
   * Decision 3: it opens on the first load after the month ended, and the
   * server is what decides that (`firstOpeningSince`). Opened as the initial
   * state and not in an effect, so it is there in the first paint rather than a
   * frame after somebody started reading.
   */
  it("is open on the render the server announced", () => {
    render(notice({ announces: true }));

    expect(sheet()).toBeInTheDocument();
  });

  it("is shut on every render after that, with the row still standing", () => {
    render(notice({ announces: false }));

    expect(sheet()).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cerrar septiembre" }),
    ).toBeInTheDocument();
  });

  // ADR-0002 said out loud before the one act nothing undoes, including what a
  // September receipt found in October then does.
  it("says what closing costs and where a late receipt lands", () => {
    render(notice({ announces: true }));

    expect(
      screen.getByText(/no vas a poder editar ni agregar nada a septiembre/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/descontar del presupuesto de octubre/i),
    ).toBeInTheDocument();
  });

  it("carries the month it named, so nothing re-derives it", () => {
    const { container } = render(notice({ announces: true }));

    expect(container.querySelector('input[name="mes"]')).toHaveValue("2026-09");
  });

  it("closes on Todavía no, leaving the row behind", async () => {
    render(notice({ announces: true }));

    await userEvent.click(screen.getByRole("button", { name: "Todavía no" }));

    expect(sheet()).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cerrar septiembre" }),
    ).toBeInTheDocument();
  });
});

describe("what the month about to be frozen holds", () => {
  it("counts its Movements", () => {
    render(notice({ announces: true }));

    expect(screen.getByText("48")).toBeInTheDocument();
  });

  it("names what is still pending", () => {
    render(notice({ announces: true }));

    expect(screen.getByText("2 fijos pendientes")).toBeInTheDocument();
  });

  it("counts one pending item in the singular", () => {
    render(notice({ announces: true, tally: { movements: 3, unpaid: 1 } }));

    expect(screen.getByText("1 fijo pendiente")).toBeInTheDocument();
  });

  /*
   * A zero is a figure somebody has to interpret. "Nada pendiente" is the same
   * fact said as the state it is: the month is fully loaded.
   */
  it("says nothing is pending rather than printing a zero", () => {
    render(notice({ announces: true, tally: { movements: 3, unpaid: 0 } }));

    expect(screen.getByText("Nada pendiente")).toBeInTheDocument();
    expect(screen.queryByText("0 fijos pendientes")).not.toBeInTheDocument();
  });
});
