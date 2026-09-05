import { expect, test } from "@playwright/test";
import { createMember, createSpaceFor, startSession } from "./session";
import { themeStorageKey } from "../src/ui/theme";

// Deliberately not the signed-in fixture: the theme control lives on the
// Ajustes screen inside a Space, which needs a Member the database really has.

/**
 * The device's answer, put on the device before the page it belongs to.
 *
 * The key is imported and not spelled: the module's own comment claims the
 * script and the reader cannot drift apart because they are built from one
 * constant, and a spec that hardcodes it is exactly the drift that claim denies.
 */
const alreadyChose = (value: string) =>
  `localStorage.setItem(${JSON.stringify(themeStorageKey)}, ${JSON.stringify(value)})`;

test("the theme is settled ahead of every element the app draws", async ({
  page,
}) => {
  // The whole of "never flashes light first" (#41), and the only place it can
  // be proved: the choice has to be read before there is anything on screen to
  // read it wrong. Read off the served HTML rather than off a screenshot -- a
  // flash is a few milliseconds and a screenshot of one is a coin toss.
  //
  // Against the top of the content and not against <body>, which is what this
  // asserted first and what failed. Next puts an inline script at the top of
  // the body whatever the layout does with it -- loose above <body>, inside a
  // hand-written <head>, or through <Script beforeInteractive>, all three land
  // in the same place. So this asserts the thing that is true and that matters:
  // nothing this app draws is parsed before the theme is known, and the
  // stylesheets above it are render-blocking, so nothing has painted either.
  const response = await page.goto("/ingresar");
  const html = (await response?.text()) ?? "";

  const decidesTheTheme = html.indexOf(themeStorageKey);
  const firstContent = html.indexOf("<main");

  expect(
    decidesTheTheme,
    "nothing in the document reads the choice",
  ).toBeGreaterThan(-1);
  expect(
    firstContent,
    "the screen draws no content to be ahead of",
  ).toBeGreaterThan(-1);
  expect(decidesTheTheme).toBeLessThan(firstContent);
});

test("a Member who chose dark opens dark, on a phone that is light", async ({
  page,
  context,
  baseURL,
}) => {
  const ana = await createMember("Ana Oscura");
  await createSpaceFor(ana.id, "Casa", "ARS");
  await startSession(context, baseURL!, ana);
  await page.emulateMedia({ colorScheme: "light" });
  await page.addInitScript(alreadyChose("dark"));

  await page.goto("/espacios");

  // Both halves matter. The attribute is the choice; the colour is the proof
  // that tokens.css heard it -- an attribute nothing reads would pass the
  // first assertion and leave the app white.
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(0, 0, 0)",
  );
});

test("a Member who chose light stays light on a phone that went dark", async ({
  page,
  context,
  baseURL,
}) => {
  // The other direction, and the one a dark-first app forgets: choosing is
  // choosing, and it overrules the phone both ways.
  const ana = await createMember("Ana Clara");
  await createSpaceFor(ana.id, "Casa", "ARS");
  await startSession(context, baseURL!, ana);
  await page.emulateMedia({ colorScheme: "dark" });
  await page.addInitScript(alreadyChose("light"));

  await page.goto("/espacios");

  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(242, 242, 247)",
  );
});

test("a Member who chose nothing is shown what their phone says, and follows it changing", async ({
  page,
  context,
  baseURL,
}) => {
  const ana = await createMember("Ana Automática");
  await createSpaceFor(ana.id, "Casa", "ARS");
  await startSession(context, baseURL!, ana);
  await page.emulateMedia({ colorScheme: "light" });

  await page.goto("/espacios");

  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.*/);
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(242, 242, 247)",
  );

  // No reload, and nothing in this app listening: with no attribute on the
  // document, `color-scheme: light dark` and every light-dark() under it track
  // the phone by themselves. This assertion is what says so.
  await page.emulateMedia({ colorScheme: "dark" });

  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(0, 0, 0)",
  );
});

test("the entry screen is drawn in the dark palette the canvas drew for it", async ({
  page,
  context,
  baseURL,
}) => {
  // #41's last criterion: "every screen is legible in the dark palette, the
  // entry screen the canvas drew most of all". No stylesheet in src/ declares a
  // colour, so every screen goes through light-dark() by construction -- but
  // that proves consistency, not that a real screen resolves the way the dark
  // artboard drew it. This opens the screen the ticket names and reads the two
  // colours `design/CargarGastoOscuro.dc.html` is most specific about.
  const ana = await createMember("Ana Anota");
  const casa = await createSpaceFor(ana.id, "Casa", "ARS");
  await startSession(context, baseURL!, ana);
  await page.emulateMedia({ colorScheme: "light" });
  await page.addInitScript(alreadyChose("dark"));

  await page.goto(`/espacios/${casa.id}/movimientos/nuevo`);

  // The untyped amount: #48484A on the dark artboard, --color-disabled here.
  await expect(page.getByRole("status")).toHaveCSS("color", "rgb(72, 72, 74)");

  // The button that cannot be pressed yet: #2C2C2E filled and #6C6C70 inked.
  // These are the pair ADR-0028 had to name apart, because in light they
  // collapse onto one colour and in dark they do not -- so a screen read in
  // daylight could never have caught them being wrong.
  const save = page.getByRole("button", { name: "Guardar" });
  await expect(save).toBeDisabled();
  await expect(save).toHaveCSS("background-color", "rgb(44, 44, 46)");
  await expect(save).toHaveCSS("color", "rgb(108, 108, 112)");
});

test("choosing dark turns the app dark, remembers it, and gives it back", async ({
  page,
  context,
  baseURL,
}) => {
  const ana = await createMember("Ana Elige");
  const casa = await createSpaceFor(ana.id, "Casa", "ARS");
  await startSession(context, baseURL!, ana);
  await page.emulateMedia({ colorScheme: "light" });

  await page.goto(`/espacios/${casa.id}/ajustes`);

  await page.getByRole("radio", { name: "Oscuro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(0, 0, 0)",
  );

  // Remembered on the device, which is what a reload asks.
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("radio", { name: "Oscuro" })).toBeChecked();

  // And the way out: the attribute comes off, and the phone is listened to
  // again. Without this the app would sit on the last thing anybody pressed.
  await page.getByRole("radio", { name: "Automático" }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.*/);
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(242, 242, 247)",
  );
});
