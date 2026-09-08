// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const tokens = readFileSync(
  path.join(import.meta.dirname, "tokens.css"),
  "utf8",
);

/**
 * A colour token is a name and two values, and jsdom can prove neither: it
 * resolves no custom properties and knows nothing of light-dark(). So the
 * declarations are read here, which is enough to catch the two ways a token
 * goes wrong — it stops existing, or it gains one palette and not the other.
 * How the pairs actually look is a question for eyes on the design canvas.
 */
const declaration = (name: string) =>
  new RegExp(`--${name}:\\s*light-dark\\(\\s*([^,]+),\\s*([^)]+)\\)\\s*;`);

const named = [
  // The pieces of the canvas tokens.css had no name for (#34).
  "color-meter-track",
  "color-separator-strong",
  "color-border-dashed",
  "color-disabled",
  "color-disabled-surface",
  "color-on-disabled",
  "color-segment-thumb",
  // The quiet ground a tray takes on a surface that is already raised (#123).
  // Named apart from --color-fill for the reason --color-disabled-surface is
  // named apart from --color-disabled: one hex cannot be a step off two
  // different grounds.
  "color-fill-on-surface",
  "color-member-first-ink",
  "color-member-first-ground",
  "color-member-second-ink",
  "color-member-second-ground",
  // The two tints a Category's circle comes in (#39). No dark Movimientos
  // artboard exists, so both dark halves were invented -- which is exactly the
  // case where a token quietly gains one palette and not the other.
  "color-category-green-ink",
  "color-category-green-ground",
  "color-category-grey-ink",
  "color-category-grey-ground",
];

describe("the tokens the canvas asks for", () => {
  it.each(named)("declares --%s in both palettes", (name) => {
    const match = tokens.match(declaration(name));

    expect(match, `--${name} is not declared with light-dark()`).not.toBeNull();

    const [, light, dark] = match ?? [];
    expect(light?.trim()).not.toBe(dark?.trim());
  });

  it("keeps the strong separator apart from the light one, in both palettes", () => {
    // The whole reason this token exists: --color-separator is too light to
    // draw the line above the tab bar. Two names holding one value would be a
    // token that quietly stopped meaning anything -- and a token that only
    // separates in daylight is one that stops meaning anything at night.
    const separator = tokens.match(declaration("color-separator"));
    const strong = tokens.match(declaration("color-separator-strong"));

    expect(separator?.[1]?.trim()).not.toBe(strong?.[1]?.trim());
    expect(separator?.[2]?.trim()).not.toBe(strong?.[2]?.trim());
  });

  it.each([
    ["light", 1],
    ["dark", 2],
  ])("keeps --color-fill off the ground it is drawn on, in %s", (_palette, at) => {
    // #102. --color-fill is the quiet block that sits on the *page*: a keypad
    // key, the segmented groove, the entry head's pill, the "Hoy · X ·
    // Cambiar" line, a refusal. Its only boundary is its own ground, so the
    // day it equals --color-background is the day twelve 44px targets stop
    // having edges. It equalled it in light, and the screen behind the whole
    // product was the one it happened on.
    const value = (name: string) => tokens.match(declaration(name))?.[at]?.trim();

    expect(value("color-fill")).not.toBe(value("color-background"));
  });

  it.each([
    ["light", 1],
    ["dark", 2],
  ])("keeps a pressed fill apart from an unpressed one, in %s", (_palette, at) => {
    // #102 moved --color-fill down towards its own pressed state rather than
    // up away from it, which is what kept --color-segment-thumb working. What
    // it costs is this margin, so the margin is asserted: a key that looks the
    // same pressed as unpressed is a key that never answers a thumb.
    const value = (name: string) => tokens.match(declaration(name))?.[at]?.trim();

    expect(value("color-fill")).not.toBe(value("color-fill-pressed"));
  });

  it.each([
    ["light", 1],
    ["dark", 2],
  ])("keeps --color-fill-on-surface off the surface it is drawn on, in %s", (_palette, at) => {
    // #123, the mirror of the above: the tray on a *sheet*, whose ground is
    // --color-surface. The two were one hex in dark (ADR-0057).
    const value = (name: string) => tokens.match(declaration(name))?.[at]?.trim();

    expect(value("color-fill-on-surface")).not.toBe(value("color-surface"));
  });

  it.each([
    ["light", 1],
    ["dark", 2],
  ])("gives the two Members different ink and ground in %s", (_palette, at) => {
    // Two avatars the same colour are worse than two with no colour at all:
    // the screen says the two Members are one person. Checked in both palettes
    // because a Space read at night is the same Space.
    const value = (name: string) => tokens.match(declaration(name))?.[at]?.trim();

    expect(value("color-member-first-ink")).not.toBe(
      value("color-member-second-ink"),
    );
    expect(value("color-member-first-ground")).not.toBe(
      value("color-member-second-ground"),
    );
  });

  it("finds the file it claims to read", () => {
    expect(tokens).toContain("--hit-target");
  });
});
