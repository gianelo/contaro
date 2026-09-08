import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CarryNotice } from "./carry-notice";
import type { ReadableCarryOver } from "./carried";

// The action is a "use server" module, which a jsdom run cannot import. What
// this file is about is which of the four sentences each person reads and
// whether anything is offered; that the action writes an income is proved where
// the rows are.
vi.mock("./actions", () => ({
  approveCarryOverAction: async () => ({ error: null }),
}));

const carried = (
  changes: Partial<ReadableCarryOver> = {},
): ReadableCarryOver => ({
  from: "2026-09" as ReadableCarryOver["from"],
  name: "septiembre",
  into: "octubre",
  amount: "$609.000",
  kind: "surplus",
  waitingOn: null,
  offer: true,
  ...changes,
});

const notice = (changes: Partial<ReadableCarryOver> = {}) => (
  <CarryNotice spaceId="space-casa" carried={carried(changes)} />
);

describe("a surplus", () => {
  it("says what was left and in which month", () => {
    render(notice());

    expect(
      screen.getByText(/Sobraron \$609\.000 en septiembre/),
    ).toBeInTheDocument();
  });

  it("offers the act to the Space's creator", async () => {
    render(notice());

    await userEvent.click(
      screen.getByRole("button", { name: "Aprobar el arrastre" }),
    );

    expect(
      screen.getByRole("dialog", { name: /Sobraron \$609\.000 en septiembre/ }),
    ).toBeInTheDocument();
  });

  /*
   * The sheet answers the one thing about this act that surprises people: the
   * money comes back with nobody's name on it, because nobody earned it
   * (ADR-0003). It is on the confirmation and not on the row, because it is
   * what somebody needs to read before they tap rather than while they scroll.
   */
  it("says where the money lands and that it is nobody's", async () => {
    render(notice());

    await userEvent.click(
      screen.getByRole("button", { name: "Aprobar el arrastre" }),
    );

    expect(
      screen.getByText(/entra como ingreso de octubre/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/no lo ganó nadie/i)).toBeInTheDocument();
  });

  /*
   * ADR-0051, and said by naming who it waits on rather than by a control that
   * cannot be pressed: a disabled button answers "why not" with nothing, so a
   * person presses it to find out.
   */
  it("states it to the invited Member and offers them nothing", () => {
    render(notice({ offer: false, waitingOn: "Ana" }));

    expect(
      screen.getByText(/espera que Ana lo apruebe/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Aprobar el arrastre" }),
    ).not.toBeInTheDocument();
  });

  /*
   * ADR-0054: a closed month keeps every link and loses every control. The
   * sentence stays and is in the past tense, because there is no yet.
   */
  it("states it on a closed month, with nobody to wait on", () => {
    render(notice({ offer: false, waitingOn: null }));

    expect(
      screen.getByText(/Sobraron \$609\.000 en septiembre y no se aprobó/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Aprobar el arrastre" }),
    ).not.toBeInTheDocument();
  });
});

describe("a deficit", () => {
  const overspent = { kind: "deficit" as const, offer: false, amount: "$240.000" };

  it("says what went over, and never offers anything", () => {
    render(notice(overspent));

    expect(
      screen.getByText(/Se gastaron \$240\.000 de más en septiembre/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  /*
   * Decision 4 of #109, and the one sentence in the product that answers
   * something a person would otherwise read as broken arithmetic. On the screen
   * and never behind a tap: an explanation somebody has to go looking for is
   * one they never see.
   */
  it("says why it is not coming off this month, unasked", () => {
    render(notice(overspent));

    expect(
      screen.getByText(/No se descuenta de este mes/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/esa plata ya se gastó/i)).toBeInTheDocument();
  });

  it("offers nothing to the invited Member either", () => {
    render(notice({ ...overspent, waitingOn: "Ana" }));

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
