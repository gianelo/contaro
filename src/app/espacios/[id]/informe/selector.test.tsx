import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { ReportDownload } from "./selector";

it("selects an available closed month and year independently of the month on screen", async () => {
  const user = userEvent.setup();
  render(<ReportDownload spaceId="home" closedMonths={["2025-12", "2026-07", "2026-09"]} inView="2026-10" />);
  await user.click(screen.getByRole("button", { name: "Descargar PDF" }));
  const dialog = screen.getByRole("dialog", { name: "Informe mensual" });
  expect(within(dialog).getByRole("combobox", { name: "Año" })).toHaveValue("2026");
  expect(within(dialog).getByRole("combobox", { name: "Mes" })).toHaveValue("2026-09");
  expect(within(dialog).queryByRole("option", { name: "octubre" })).toBeNull();
  await user.selectOptions(within(dialog).getByRole("combobox", { name: "Año" }), "2025");
  expect(within(dialog).getByRole("combobox", { name: "Mes" })).toHaveValue("2025-12");
});

it("explains why an empty Space has nothing to download", () => {
  render(<ReportDownload spaceId="home" closedMonths={[]} inView="2026-10" />);
  expect(screen.getByRole("button", { name: "Descargar PDF" })).toBeDisabled();
  expect(screen.getByText("Todavía no hay meses cerrados para descargar.")).toBeInTheDocument();
});

it("preserves the chosen closed period after cancelling and reopening", async () => {
  const user = userEvent.setup();
  render(<ReportDownload spaceId="home" closedMonths={["2025-12", "2026-09"]} inView="2026-09" />);
  await user.click(screen.getByRole("button", { name: "Descargar PDF" }));
  await user.selectOptions(screen.getByRole("combobox", { name: "Año" }), "2025");
  await user.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  const trigger = screen.getByRole("button", { name: "Descargar PDF" });
  expect(trigger).toHaveFocus();
  await user.click(trigger);
  expect(screen.getByRole("combobox", { name: "Mes" })).toHaveValue("2025-12");
});
