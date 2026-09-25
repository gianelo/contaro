import { describe, expect, it } from "vitest";
import { inAppPath } from "./in-app-path";

const fallback = "/espacios";

describe("an in-app path read from a form", () => {
  it("is kept when it is a path in this app", () => {
    expect(inAppPath("/espacios/casa/movimientos", fallback)).toBe(
      "/espacios/casa/movimientos",
    );
  });

  it("keeps its query and fragment", () => {
    expect(inAppPath("/espacios/casa?mes=2026-09#fijos", fallback)).toBe(
      "/espacios/casa?mes=2026-09#fijos",
    );
  });

  it.each([
    ["nothing at all", ""],
    ["another site", "https://evil.example/espacios"],
    ["a protocol-relative address", "//evil.example/espacios"],
    ["a backslash the browser reads as a slash", "/\\evil.example"],
    ["a scheme", "javascript:alert(1)"],
    ["a relative path", "espacios/casa"],
    ["a control character", "/espacios\n/casa"],
  ])("falls back for %s", (_, raw) => {
    expect(inAppPath(raw, fallback)).toBe(fallback);
  });
});
