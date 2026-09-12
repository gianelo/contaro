import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SpaceMenu } from "./space-menu";

const CASA = { id: "casa", name: "Casa", currency: "COP" } as const;

const nothing = async () => {};

describe("SpaceMenu", () => {
  it("is a shut door: the menu is nowhere until the hamburger is pressed", () => {
    render(<SpaceMenu member="Gian" space={CASA} signOut={nothing} />);

    expect(
      screen.getByRole("button", { name: "Abrir menú del Espacio" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens onto the Space it is about, and says which one that is", async () => {
    render(<SpaceMenu member="Gian" space={CASA} signOut={nothing} />);

    await userEvent.click(
      screen.getByRole("button", { name: "Abrir menú del Espacio" }),
    );

    // Which Space this menu is about is the one thing it cannot leave unsaid:
    // opened from the Spaces list it is about whichever Space was last used,
    // and a menu that changed what "Ajustes" meant without saying so would be
    // a settings screen a person did not choose.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Casa · COP")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ajustes" })).toHaveAttribute(
      "href",
      "/espacios/casa/ajustes",
    );
  });

  it("is where signing out lives now, and reaching it costs a second tap", async () => {
    const signOut = vi.fn(async () => {});
    render(<SpaceMenu member="Gian" space={CASA} signOut={signOut} />);

    // The first tap is the door. That is the whole confirmation ADR-0059
    // bought: the old row signed a person out on one accidental press.
    await userEvent.click(
      screen.getByRole("button", { name: "Abrir menú del Espacio" }),
    );
    expect(signOut).not.toHaveBeenCalled();

    await userEvent.click(
      screen.getByRole("button", { name: "Cerrar sesión" }),
    );
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("titles itself with the session where there is nobody to title it with", async () => {
    render(<SpaceMenu member={null} space={CASA} signOut={nothing} />);

    await userEvent.click(
      screen.getByRole("button", { name: "Abrir menú del Espacio" }),
    );

    // Auth.js allows a session to carry no name. The sheet is still about
    // something, and the answer is decided here rather than by each of the two
    // screens that draw this -- two of them deciding apart is two titles.
    expect(
      screen.getByRole("heading", { name: "Tu sesión", level: 2 }),
    ).toBeInTheDocument();
  });

  it("titles itself with the name a person is called by, not the whole of it", async () => {
    render(
      <SpaceMenu member="Gian Solo Barboza" space={CASA} signOut={nothing} />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Abrir menú del Espacio" }),
    );

    expect(
      screen.getByRole("heading", { name: "Gian", level: 2 }),
    ).toBeInTheDocument();
  });

  it("still answers sign-out with no Space to be about, and offers nothing that would be", async () => {
    const signOut = vi.fn(async () => {});
    render(<SpaceMenu member="Gian" space={null} signOut={signOut} />);

    await userEvent.click(
      screen.getByRole("button", { name: "Abrir menú del Espacio" }),
    );

    // A Member who has never opened a Space still has a session to leave. The
    // rows that are a Space's are the ones that go missing, not the way out:
    // this is the only screen with no tab bar under it to reach Ajustes from.
    expect(
      screen.queryByRole("link", { name: "Ajustes" }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Cerrar sesión" }),
    );
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
