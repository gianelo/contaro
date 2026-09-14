import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NewSpaceForm } from "./form";

// The action is a "use server" module, which a jsdom run cannot import. What
// this file is about is the head this screen wears and the one control in it;
// that a Space actually gets created is proved in `create.test.ts` and again
// against a real database.
vi.mock("./actions", () => ({
  createSpaceAction: async () => ({ error: null }),
}));

const choices = [
  { value: "ARS", label: "Peso argentino (ARS)" },
  { value: "COP", label: "Peso colombiano (COP)" },
];

const theScreen = () => <NewSpaceForm choices={choices} />;

/** The one control that creates the Space, wherever on the screen it stands. */
const crear = () => screen.getByRole("button", { name: /^Cre/ });

describe("the screen a Space is created on", () => {
  it("says the way out in the head, where a thumb reaching to leave already is", () => {
    // It used to be a `ButtonLink` under the form, which is a scroll past the
    // currency picker from anywhere a person changes their mind. The canvas
    // has drawn it in the head since it was first drawn (#142).
    render(theScreen());

    expect(screen.getByRole("link", { name: "Cancelar" })).toHaveAttribute(
      "href",
      "/espacios",
    );
  });

  it("names the screen once, as the head's heading", () => {
    render(theScreen());

    expect(
      screen.getByRole("heading", { name: "Nuevo espacio", level: 1 }),
    ).toBeInTheDocument();
  });

  it("offers one control that creates the Space and never two", () => {
    // The head's `Crear` is the form's submit control and not a second way in
    // beside it: two would be two disabled rules to keep in step (#142).
    render(theScreen());

    expect(screen.getAllByRole("button", { name: /^Cre/ })).toHaveLength(1);
  });

  it("submits the form it stands outside of", () => {
    // The control sits in the head and the fields sit in the form below it, so
    // the association is the `form` attribute rather than the DOM.
    render(theScreen());

    const form = document.querySelector("form");
    expect(form?.id).toBeTruthy();
    expect(crear()).toHaveAttribute("form", form!.id);
  });

  it("refuses Crear until the form can be submitted", async () => {
    // The canvas draws it at --color-disabled on an empty form, which is a
    // state the code did not have: `disabled={pending}` is refused while
    // submitting and never before anything is typed (#142).
    render(theScreen());

    expect(crear()).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Nombre"), "Casa");
    // A name alone is not a Space: the currency is still unanswered, and
    // ADR-0001 makes it the one answer that can never be taken back.
    expect(crear()).toBeDisabled();

    await userEvent.selectOptions(screen.getByLabelText("Moneda"), "ARS");
    expect(crear()).toBeEnabled();
  });

  it("refuses it again when what was typed is taken back", async () => {
    render(theScreen());

    await userEvent.type(screen.getByLabelText("Nombre"), "Casa");
    await userEvent.selectOptions(screen.getByLabelText("Moneda"), "ARS");
    expect(crear()).toBeEnabled();

    await userEvent.clear(screen.getByLabelText("Nombre"));
    expect(crear()).toBeDisabled();
  });

  it("still says the currency can never be changed, before it is chosen", () => {
    // ADR-0001 said before the choice and not after it. Moving the way out
    // and the way in into the head leaves the form's own argument alone.
    render(theScreen());

    expect(screen.getByRole("note")).toHaveTextContent(
      /no se puede cambiar nunca/,
    );
  });
});
