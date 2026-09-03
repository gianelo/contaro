import { describe, expect, it } from "vitest";
import {
  CurrencyIsImmutableError,
  MAX_SPACE_NAME_LENGTH,
  UnusableSpaceError,
  amendSpace,
  createSpace,
} from "./space";

const ana = "3f2b0c1e-0000-4000-8000-000000000001";

const casa = { id: "3f2b0c1e-0000-4000-8000-0000000000ca", name: "Casa", currency: "ARS" } as const;

describe("creating a Space", () => {
  it("gives it the name and the currency it was asked for", () => {
    const { space } = createSpace({ name: "Casa", currency: "ARS" }, ana);

    expect(space).toEqual({ name: "Casa", currency: "ARS" });
  });

  it("puts the creator inside it, so nobody creates a Space they cannot open", () => {
    const { memberIds } = createSpace({ name: "Casa", currency: "ARS" }, ana);

    expect(memberIds).toEqual([ana]);
  });

  it("trims the name, because a trailing space is a typo and not a name", () => {
    const { space } = createSpace({ name: "  Casa  ", currency: "ARS" }, ana);

    expect(space.name).toBe("Casa");
  });

  it("refuses a Space with no name", () => {
    expect(() => createSpace({ name: "   ", currency: "ARS" }, ana)).toThrow(
      UnusableSpaceError,
    );
  });

  it("refuses a name longer than a row can show", () => {
    const tooLong = "a".repeat(MAX_SPACE_NAME_LENGTH + 1);

    expect(() => createSpace({ name: tooLong, currency: "ARS" }, ana)).toThrow(
      UnusableSpaceError,
    );
  });

  it("accepts a name exactly as long as the limit", () => {
    const atTheLimit = "a".repeat(MAX_SPACE_NAME_LENGTH);

    expect(
      createSpace({ name: atTheLimit, currency: "ARS" }, ana).space.name,
    ).toBe(atTheLimit);
  });

  it("refuses a currency it does not offer", () => {
    expect(() => createSpace({ name: "Casa", currency: "XYZ" }, ana)).toThrow(
      UnusableSpaceError,
    );
  });

  it("says which field it refused, so a screen can point at it", () => {
    expect(() => createSpace({ name: "", currency: "ARS" }, ana)).toThrow(
      expect.objectContaining({ field: "name" }),
    );
    expect(() => createSpace({ name: "Casa", currency: "" }, ana)).toThrow(
      expect.objectContaining({ field: "currency" }),
    );
  });

  it("refuses a Space with no creator", () => {
    expect(() => createSpace({ name: "Casa", currency: "ARS" }, " ")).toThrow(
      UnusableSpaceError,
    );
  });
});

describe("amending a Space", () => {
  it("changes the name", () => {
    expect(amendSpace(casa, { name: "Casa nueva" })).toEqual({
      ...casa,
      name: "Casa nueva",
    });
  });

  it("holds the name to the same rules creation does", () => {
    expect(() => amendSpace(casa, { name: "  " })).toThrow(UnusableSpaceError);
  });

  it("refuses to change the currency, rather than quietly ignoring it", () => {
    expect(() => amendSpace(casa, { currency: "USD" })).toThrow(
      CurrencyIsImmutableError,
    );
  });

  it("refuses a currency it does not even offer, which is still an attempt", () => {
    expect(() => amendSpace(casa, { currency: "XYZ" })).toThrow(
      CurrencyIsImmutableError,
    );
  });

  it("refuses the change whole, leaving the name alone too", () => {
    expect(() =>
      amendSpace(casa, { name: "Casa nueva", currency: "USD" }),
    ).toThrow(CurrencyIsImmutableError);
    expect(casa.name).toBe("Casa");
  });

  it("lets a change name the currency the Space already has, which changes nothing", () => {
    expect(amendSpace(casa, { name: "Casa nueva", currency: "ARS" })).toEqual({
      ...casa,
      name: "Casa nueva",
    });
  });

  it("never moves a Space to another identity", () => {
    expect(amendSpace(casa, { name: "Casa nueva" }).id).toBe(casa.id);
  });
});
