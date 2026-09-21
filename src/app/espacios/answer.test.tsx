import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AnswerInvitation } from "./answer";
import { nothingWrongYet } from "./invitations";

vi.mock("next/navigation", () => ({
  usePathname: () => "/espacios/casa/movimientos",
  useSearchParams: () => new URLSearchParams("mes=2026-08"),
}));

describe("an answer to an invitation", () => {
  /*
   * Where it was answered from travels with it, so that turning a seat down
   * from a Space's screen puts you back on that screen rather than on the list
   * (#152). The month is part of the screen: somebody reading August who
   * turns a seat down is still reading August afterwards.
   */
  it("carries the screen it was answered from, month and all", () => {
    const { container } = render(
      <AnswerInvitation
        invitationId="invitation-1"
        action={async () => nothingWrongYet}
        label="Rechazar"
        working="Un momento…"
      />,
    );

    const from = container.querySelector<HTMLInputElement>(
      'input[type="hidden"][name="from"]',
    );
    expect(from?.value).toBe("/espacios/casa/movimientos?mes=2026-08");
  });
});
