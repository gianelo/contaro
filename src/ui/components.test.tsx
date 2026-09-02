import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./button";
import { GroupedList, GroupedListItem } from "./grouped-list";
import { BottomSheet } from "./bottom-sheet";
import { AppShell } from "./app-shell";

describe("Button", () => {
  it("calls its handler", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Guardar</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not call its handler while disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Guardar
      </Button>,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("GroupedList", () => {
  it("labels the group", () => {
    render(
      <GroupedList label="Hoy">
        <GroupedListItem>Éxito</GroupedListItem>
      </GroupedList>,
    );
    expect(screen.getByRole("group", { name: "Hoy" })).toBeInTheDocument();
  });

  it("renders a non-actionable item as plain content, not a button", () => {
    render(
      <GroupedList label="Hoy">
        <GroupedListItem>Éxito</GroupedListItem>
      </GroupedList>,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("Éxito")).toBeInTheDocument();
  });
});

describe("BottomSheet", () => {
  it("renders nothing while closed", () => {
    render(
      <BottomSheet open={false} title="Cerrar septiembre" onClose={() => {}}>
        <p>Contenido</p>
      </BottomSheet>,
    );
    expect(screen.queryByText("Contenido")).not.toBeInTheDocument();
  });

  it("is a dialog named by its title", () => {
    render(
      <BottomSheet open title="Cerrar septiembre" onClose={() => {}}>
        <p>Contenido</p>
      </BottomSheet>,
    );
    expect(
      screen.getByRole("dialog", { name: "Cerrar septiembre" }),
    ).toBeInTheDocument();
  });

  it("closes on the scrim and on Escape", async () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open title="Cerrar septiembre" onClose={onClose}>
        <p>Contenido</p>
      </BottomSheet>,
    );
    await userEvent.click(screen.getByTestId("bottom-sheet-scrim"));
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe("AppShell", () => {
  it("renders navigation through a slot rather than a fixed tab bar", () => {
    render(
      <AppShell navigation={<nav aria-label="Otra navegación" />}>
        <p>Contenido</p>
      </AppShell>,
    );
    expect(
      screen.getByRole("navigation", { name: "Otra navegación" }),
    ).toBeInTheDocument();
  });

  it("renders without navigation at all", () => {
    render(
      <AppShell>
        <p>Contenido</p>
      </AppShell>,
    );
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.getByText("Contenido")).toBeInTheDocument();
  });
});
