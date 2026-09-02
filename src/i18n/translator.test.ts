import { describe, expect, it } from "vitest";
import { createTranslator } from "./translator";

const messages = {
  "movement.save": "Guardar",
  "space.sharedWith": "Compartido con {member}",
  "budget.remaining": "Te quedan {amount} de {total}",
} as const;

const t = createTranslator(messages);

describe("createTranslator", () => {
  it("resolves a key to its message", () => {
    expect(t("movement.save")).toBe("Guardar");
  });

  it("interpolates a named parameter", () => {
    expect(t("space.sharedWith", { member: "Ana" })).toBe("Compartido con Ana");
  });

  it("interpolates every occurrence of every parameter", () => {
    expect(t("budget.remaining", { amount: "$10", total: "$50" })).toBe(
      "Te quedan $10 de $50",
    );
  });

  it("throws when a placeholder has no matching parameter", () => {
    // Shipping a literal "{member}" to a user is worse than failing loudly.
    expect(() => t("space.sharedWith")).toThrowError(/member/);
  });

  it("throws when the key is not in the catalogue", () => {
    // @ts-expect-error the key is deliberately outside the catalogue
    expect(() => t("nope.missing")).toThrowError(/nope\.missing/);
  });
});
