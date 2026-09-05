import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EntryHead } from "./head";

describe("the head of the screen an expense is recorded on", () => {
  it("puts the way out where a thumb reaching to leave already is", () => {
    // Cancelar was at the foot of the page, which is a scroll past the keypad
    // from anywhere a person changes their mind.
    render(<EntryHead back="/espacios/casa/movimientos" sharedWith={null} />);

    expect(screen.getByRole("link", { name: "Cancelar" })).toHaveAttribute(
      "href",
      "/espacios/casa/movimientos",
    );
  });

  it("names the screen once, as its heading", () => {
    render(<EntryHead back="/espacios/casa/movimientos" sharedWith={null} />);

    expect(
      screen.getByRole("heading", { name: "Nuevo movimiento" }),
    ).toBeInTheDocument();
  });

  it("says whose Space this is when it is somebody else's too", () => {
    render(<EntryHead back="/espacios/casa/movimientos" sharedWith="Ana" />);

    expect(screen.getByText("Compartido con Ana")).toBeInTheDocument();
  });

  it("says nothing of the sort in a Space of one", () => {
    // There is nobody to share it with, so the pill would be a line stating
    // the obvious above the one figure that matters.
    render(<EntryHead back="/espacios/casa/movimientos" sharedWith={null} />);

    expect(screen.queryByText(/Compartido/)).toBeNull();
  });
});
