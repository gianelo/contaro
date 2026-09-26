import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { AvisosSheet } from "./avisos-sheet";
import type { AnnouncedClose } from "./waiting";
import type { WaitingInvitation } from "@/domain/space/invitation";

vi.mock("../actions", () => ({
  acceptInvitationAction: async () => ({ error: null }),
  declineInvitationAction: async () => ({ error: null }),
}));
vi.mock("./actions", () => ({ closeMonthAction: async () => ({ error: null }) }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/espacios/casa",
  useSearchParams: () => new URLSearchParams("mes=2026-08"),
}));

const waiting: AnnouncedClose = {
  month: "2026-07" as AnnouncedClose["month"],
  name: "julio",
  nextName: "septiembre",
  waitingOn: null,
  announces: false,
  tally: { movements: 4, unpaid: 0 },
};
const invitation = {
  invitation: { id: "invitation-one" },
  invitedByName: "Ana",
  space: { name: "Casa" },
} as WaitingInvitation;
const props = {
  spaceId: "casa",
  spaceName: "Casa",
  invitations: [invitation],
  waiting,
  unpaidFixedCount: 2,
  fixedMonthName: "septiembre",
  fixedMonth: "2026-09",
};

it("opens notices with inline invitation answers, the oldest close and only a Budget destination", async () => {
  const user = userEvent.setup();
  const { container } = render(<AvisosSheet {...props} />);
  await user.click(screen.getByRole("button", { name: "Avisos" }));
  const notices = screen.getByRole("dialog", { name: "Avisos" });
  expect(within(notices).getByText(/Invitación de Ana/)).toBeInTheDocument();
  expect(container.querySelector('input[name="invitationId"]')).toHaveValue("invitation-one");
  expect(container.querySelector('input[name="from"]')).toHaveValue("/espacios/casa?mes=2026-08");
  expect(within(notices).getByRole("button", { name: "Aceptar" })).toBeInTheDocument();
  expect(within(notices).getByRole("button", { name: "Rechazar" })).toBeInTheDocument();
  expect(within(notices).getByText(/2 gastos de septiembre/)).toBeInTheDocument();
  expect(within(notices).getByRole("link", { name: /Fijos impagos/ })).toHaveAttribute("href", "/espacios/casa/presupuesto?mes=2026-09");
  expect(within(notices).getByRole("link").querySelector("svg")).toBeInTheDocument();
  await user.click(within(notices).getByRole("button", { name: "Revisar y cerrar" }));
  expect(screen.getByRole("dialog", { name: "Cerrar julio" })).toBeInTheDocument();
  expect(container.querySelector('input[name="mes"]')).toHaveValue("2026-07");
});

it("shows Member state without a close action and provides an empty state", async () => {
  const user = userEvent.setup();
  const { rerender } = render(<AvisosSheet {...props} invitations={[]} unpaidFixedCount={0} waiting={{ ...waiting, waitingOn: "Gian" }} />);
  await user.click(screen.getByRole("button", { name: "Avisos" }));
  expect(screen.getByText(/Gian/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Revisar y cerrar" })).not.toBeInTheDocument();
  rerender(<AvisosSheet {...props} invitations={[]} unpaidFixedCount={0} waiting={null} />);
  expect(screen.getByText(/No tenés avisos pendientes/)).toBeInTheDocument();
});
