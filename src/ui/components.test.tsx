import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./button";
import { GroupedList, GroupedListItem } from "./grouped-list";
import { BottomSheet } from "./bottom-sheet";
import { AppShell } from "./app-shell";
import { SelectField, TextField } from "./field";
import { Notice } from "./notice";

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

  it("still names the group for a screen reader when the heading is hidden", () => {
    render(
      <GroupedList label="Espacios" labelHidden>
        <GroupedListItem>Casa</GroupedListItem>
      </GroupedList>,
    );

    // A screen whose own title already says "Espacios" should not print it a
    // second time, but a group nobody can name is a group nobody can skip to.
    // That it is really off the screen is measured in a browser, by
    // e2e/space-list.spec.ts.
    expect(screen.getByRole("group", { name: "Espacios" })).toBeInTheDocument();
  });

  it("renders an item with a destination as a link to it, not a button", () => {
    render(
      <GroupedList label="Espacios">
        <GroupedListItem href="/espacios/casa">Casa</GroupedListItem>
      </GroupedList>,
    );

    // A row that goes somewhere is a link, for the reason ButtonLink is one:
    // it opens in a new tab and it works before any JavaScript has loaded.
    expect(screen.getByRole("link", { name: "Casa" })).toHaveAttribute(
      "href",
      "/espacios/casa",
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders a non-actionable item as plain content, not a button", () => {
    render(
      <GroupedList label="Hoy">
        <GroupedListItem>Éxito</GroupedListItem>
      </GroupedList>,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
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

  it("renders the account through a slot too, whatever it holds", () => {
    render(
      <AppShell account={<section aria-label="Otra sesión" />}>
        <p>Contenido</p>
      </AppShell>,
    );
    expect(
      screen.getByRole("region", { name: "Otra sesión" }),
    ).toBeInTheDocument();
  });

  it("renders without navigation or account at all", () => {
    render(
      <AppShell>
        <p>Contenido</p>
      </AppShell>,
    );
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    expect(screen.getByText("Contenido")).toBeInTheDocument();
  });
});

describe("TextField", () => {
  it("ties its label to its control", async () => {
    render(<TextField name="name" label="Nombre" />);

    await userEvent.type(screen.getByLabelText("Nombre"), "Casa");

    expect(screen.getByLabelText("Nombre")).toHaveValue("Casa");
  });

  it("reads its hint out with the control, rather than leaving it decorative", () => {
    render(<TextField name="name" label="Nombre" hint="Casa, Personal" />);

    expect(screen.getByRole("textbox", { name: "Nombre" })).toHaveAccessibleDescription(
      "Casa, Personal",
    );
  });
});

describe("SelectField", () => {
  it("offers exactly the choices it was given", () => {
    render(
      <SelectField
        name="currency"
        label="Moneda"
        choices={[
          { value: "ARS", label: "Peso argentino (ARS)" },
          { value: "USD", label: "Dólar estadounidense (USD)" },
        ]}
      />,
    );

    expect(
      screen.getAllByRole("option").map((option) => option.textContent),
    ).toEqual(["Peso argentino (ARS)", "Dólar estadounidense (USD)"]);
  });

  it("starts on the choice it was told to start on", () => {
    render(
      <SelectField
        name="currency"
        label="Moneda"
        defaultValue="USD"
        choices={[
          { value: "ARS", label: "Peso argentino (ARS)" },
          { value: "USD", label: "Dólar estadounidense (USD)" },
        ]}
      />,
    );

    expect(screen.getByRole("combobox", { name: "Moneda" })).toHaveValue("USD");
  });
});

describe("Notice", () => {
  it("is a note on the screen, not an alert about something that happened", () => {
    render(<Notice variant="warning">La moneda no se puede cambiar.</Notice>);

    expect(screen.getByRole("note")).toHaveTextContent(
      "La moneda no se puede cambiar.",
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
