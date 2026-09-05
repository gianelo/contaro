import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { storedTheme, themeStorageKey } from "@/ui/theme";
import { Appearance } from "./appearance";

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe("choosing how the app is lit", () => {
  it("offers the three answers a theme has, and no fourth", () => {
    // Three and not two. #1 left the dark theme open and the canvas answered
    // it with a whole dark artboard; what it never drew was the switch, and a
    // switch is the wrong shape: "follow the phone" is a real answer (#41).
    render(<Appearance />);

    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByRole("radio", { name: "Automático" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Claro" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Oscuro" })).toBeInTheDocument();
  });

  it("names the choice, because three words on a track do not", () => {
    // Unlike "Gasto | Ingreso", the halves here do not say what the question
    // is: automatic what? So this control gets the heading that one refuses.
    render(<Appearance />);

    expect(
      screen.getByRole("radiogroup", { name: "Apariencia" }),
    ).toBeInTheDocument();
  });

  it("starts on following the phone", () => {
    render(<Appearance />);

    expect(screen.getByRole("radio", { name: "Automático" })).toBeChecked();
  });

  it("opens on the choice this device already made", () => {
    // Arrived here from a previous visit: the control has to say which one is
    // true, or a person cannot tell whether the app is dark because they asked
    // for it or because their phone is.
    localStorage.setItem(themeStorageKey, "light");

    render(<Appearance />);

    expect(screen.getByRole("radio", { name: "Claro" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Automático" })).not.toBeChecked();
  });

  it("remembers what a thumb pressed", async () => {
    render(<Appearance />);

    await userEvent.click(screen.getByRole("radio", { name: "Oscuro" }));

    expect(storedTheme()).toBe("dark");
    expect(screen.getByRole("radio", { name: "Oscuro" })).toBeChecked();
  });

  it("turns the screen dark then and there, without a reload", async () => {
    render(<Appearance />);

    await userEvent.click(screen.getByRole("radio", { name: "Oscuro" }));

    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("hands the screen back to the phone, attribute and all", async () => {
    // The way out. Left behind, the attribute would pin the app to the last
    // thing anybody pressed and the phone would never be listened to again.
    render(<Appearance />);

    await userEvent.click(screen.getByRole("radio", { name: "Oscuro" }));
    await userEvent.click(screen.getByRole("radio", { name: "Automático" }));

    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(storedTheme()).toBe("system");
  });
});
