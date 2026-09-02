import { describe, expect, it } from "vitest";
import { es } from "./messages.es";
import { locale, t } from "./index";

describe("i18n", () => {
  it("ships Spanish as the only language", () => {
    expect(locale).toBe("es");
  });

  it("resolves interface copy to Spanish", () => {
    // Pinned literally, not against the catalogue: comparing t() to the very
    // object t() is built from could not fail.
    expect(t("nav.movements")).toBe("Movimientos");
    expect(t("nav.spaces")).toBe("Espacios");
    expect(t("action.save")).toBe("Guardar");
  });

  it("has no empty message in the catalogue", () => {
    const empty = Object.entries(es).filter(([, value]) => value.trim() === "");
    expect(empty).toEqual([]);
  });

  it("keeps 'cerrar' for the Monthly close, not for dismissing a sheet", () => {
    // ADR-0002: the Monthly close is the one irreversible act in the product.
    // Reusing its verb to dismiss a sheet is how someone closes a month by
    // accident.
    const dismissals = ["action.cancel", "action.dismiss"] as const;
    for (const key of dismissals) {
      expect(t(key).toLowerCase()).not.toContain("cerrar");
    }
  });
});
