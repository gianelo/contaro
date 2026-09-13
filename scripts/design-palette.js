/**
 * An artboard names a token, not a colour (#138).
 *
 * ADR-0057 split `--color-fill` into two tokens because one hex could not be
 * a step off two different grounds. The code moved; the artboards did not, so
 * `design/*.dc.html` went on drawing the retired value as the product's
 * official picture — the invisible keypad key of #102, still on the canvas
 * today. That is the seventh time this exact shape of drift has been found by
 * a person noticing (#37, #62, #64, #67, #68, #95): a colour, a name, a
 * feature or a screen exists in `src/` and the canvas quietly stopped
 * agreeing with it.
 *
 * The fix this file is half of: an artboard's `<helmet><style>` carries a
 * GENERATED copy of `src/ui/tokens.css`'s colour palette, and everything the
 * artboard draws references it with `var(--color-…)` the way the app does.
 * After that, a token change lands in one place instead of nineteen, and this
 * class of drift stops being possible for colour at all — the argument
 * `scripts/design-bundle.js` already won for structure, pointed at colour.
 *
 * Every function below is pure: it takes text and returns data, the way
 * `design-bundle.js`'s functions do, so this is testable without a design
 * folder on disk and so `scripts/check-design-bundle.js` is the only place
 * that touches a filesystem.
 */

/**
 * The marker a generated palette block opens and closes with. Both halves are
 * a plain CSS comment, so a generated block is inert wherever a `<style>`
 * happens to have it and legible to a person reading the artboard raw.
 *
 * The reason this is a constant rather than a shape re-derived from context:
 * `helmetPaletteIn` has to find the exact block `withPalette` last wrote,
 * byte for byte, and the only reliable way to do that is to look for the same
 * literal fence every time. A regex loose enough to "recognise" a palette
 * block by looking like one would also match a block a person hand-edited
 * into looking like one, which is the one thing a generated block must never
 * silently accept.
 */
const BEGIN = "/* BEGIN generated palette — from src/ui/tokens.css, do not hand-edit (pnpm build:design regenerates this, #138) */";
const END = "/* END generated palette */";

/** `BEGIN`/`END` as a regex, escaped once rather than at every call site. */
const BLOCK_PATTERN = new RegExp(`${escapeForRegExp(BEGIN)}[\\s\\S]*?${escapeForRegExp(END)}`);

/** The one artboard the canvas draws in the dark half of the palette. */
const DARK_ARTBOARDS = new Set(["CargarGastoOscuro.dc.html"]);

/**
 * Six-digit hex colours only. `#105` and `#123` are issue references that sit
 * in this very codebase's prose (canvas.json's own annotations, this file's
 * own comments) and read as colours to a regex that does not count digits —
 * `\b` alone is not enough, since `#1055` would satisfy it too. Anchoring the
 * count to exactly six hex digits, with no seventh following, is what tells
 * "#105 in the ticket" apart from "#0E7C66 on the button": a colour in this
 * codebase is always spelled out in full, never shortened to three digits.
 *
 * @type {RegExp}
 */
const HEX_RE = /#[0-9A-Fa-f]{6}(?![0-9A-Fa-f])/g;

/**
 * `rgb(...)`/`rgba(...)` colour functions. `--color-scrim` is the one token
 * in tokens.css spelled this way rather than as a hex pair, so an artboard
 * that inlines a scrim value — or any other colour someone reaches for this
 * syntax to write — has to be caught the same way a hex is.
 *
 * @type {RegExp}
 */
const RGB_RE = /\brgba?\([^)]*\)/g;

/** A `--canvas-*` custom-property declaration, value and terminating `;` included. */
const CANVAS_DECLARATION_RE = /--canvas-[\w-]+\s*:\s*[^;]+;/g;

/**
 * The colour and shadow custom-property declarations from `tokens.css`'s
 * `:root`, verbatim and in source order.
 *
 * `--color-*` and `--shadow-*` only: `:root` also declares type, spacing and
 * radius tokens, and an artboard's palette is a palette, not the whole design
 * system. Verbatim rather than re-serialized, because `light-dark(...)` is
 * exactly what makes the value single-sourced (the browser resolves the half,
 * `color-scheme` picks it) — reformatting it here would be this script having
 * an opinion about a value it is only supposed to be carrying.
 *
 * Shadows joined colours here rather than staying out, because
 * `classifyColoursIn`'s `RGB_RE` treats `rgb()`/`rgba()` as a colour wherever
 * it appears — including inside a shadow value like `--shadow-raised`'s — and
 * a `--canvas-*` declaration is reserved for staging a colour a static
 * artboard cannot composite (#138), which a shadow never is: it is a real
 * token an artboard legitimately draws with, and `Main.dc.html` /
 * `CargarGastoOscuro.dc.html`'s selected-segment shadow is exactly that case.
 * Excluding shadows here would leave that value with no bucket it could ever
 * land in outside "hardcoded", for a hex the check is right to keep flagging.
 *
 * Throws rather than answering an empty list. A check that silently finds no
 * palette is a check that passes on a file it never read, which is how the
 * drift this whole issue is about got as far as it did — `design-bundle.js`'s
 * `payloadAt` throws for the identical reason, on the identical shape of
 * mistake, and this matches it rather than inventing a second voice for one
 * failure mode.
 *
 * @param {string} tokensCss the text of `src/ui/tokens.css`
 * @returns {string[]} each declaration, trimmed, e.g. `"--color-background: light-dark(#f2f2f7, #000000);"`
 */
export function paletteFrom(tokensCss) {
  const root = tokensCss.match(/:root\s*\{([\s\S]*?)\n\}/);
  if (!root) {
    throw new Error(
      "tokens.css has no :root block — there is nowhere for a palette to come from.",
    );
  }

  const declarations = root[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^--(?:color|shadow)-[\w-]+:\s*.+;$/.test(line));

  if (declarations.length === 0) {
    throw new Error(
      "tokens.css's :root declares no --color- or --shadow- custom property. A " +
        "palette check that finds none is a check that passes on a file it never read (#138).",
    );
  }

  return declarations;
}

/**
 * Which half of the palette an artboard draws in.
 *
 * Kept in one named place rather than scattered across call sites, the way
 * `withHeader`/`withoutHeader` in `design-bundle.test.ts` name a fact about
 * every artboard once instead of re-deciding it wherever it is needed.
 * `CargarGastoOscuro.dc.html` is the only dark artboard the canvas draws
 * today; everything else — including the three "idea" mockups and the
 * corrections, which draw no dark variant at all — takes the light half.
 *
 * @param {string} file an artboard's filename, e.g. `"Main.dc.html"`
 * @returns {"light" | "dark"}
 */
export function schemeFor(file) {
  return DARK_ARTBOARDS.has(file) ? "dark" : "light";
}

/**
 * The exact `<style>` text a palette block is: one `color-scheme` line and
 * the colour custom properties `paletteFrom` reads, wrapped in a `:root` rule
 * and fenced by `BEGIN`/`END` so it can be found and replaced later.
 *
 * `color-scheme` first and inside the same rule as the palette it picks a
 * half from — that is the whole mechanism ADR-0057's `light-dark()` values
 * depend on: the browser will not know which half to resolve without it, and
 * a `:root` declared separately from this one would still work here (custom
 * properties from every `:root` rule merge) but would read as two decisions
 * where there is one.
 *
 * @param {string} tokensCss the text of `src/ui/tokens.css`
 * @param {"light" | "dark"} scheme
 * @returns {string} the block, ready to hand to `withPalette`
 */
export function paletteBlockFor(tokensCss, scheme) {
  const declarations = paletteFrom(tokensCss);
  const overrides = scheme === "dark" ? forcedDarkIn(tokensCss) : new Map();
  return [
    BEGIN,
    ":root {",
    `  color-scheme: ${scheme};`,
    ...declarations.map((declaration) => `  ${overrides.get(nameOf(declaration)) ?? declaration}`),
    "}",
    END,
  ].join("\n");
}

/**
 * The declarations `[data-theme="dark"]` overrides, by token name.
 *
 * `tokens.css` says it in its own words: "Shadows are not colours, so
 * light-dark() cannot hold them." Every colour carries both halves inside one
 * `light-dark(...)` value and needs nothing from here; the two shadows carry
 * only their light value in `:root` and are re-declared for dark twice over,
 * once in a `prefers-color-scheme` query and once in `[data-theme="dark"]`.
 *
 * `color-scheme` cannot reach either of those. It tells `light-dark()` which
 * half to resolve and nothing else — it is not a media feature, so declaring
 * it does not satisfy `prefers-color-scheme`. A dark artboard whose block
 * copied `:root` alone would therefore draw the LIGHT shadow under a dark
 * palette: `--shadow-raised` at 12% black where the running app draws `none`,
 * on the one artboard that exists to show what dark looks like, certified
 * correct by the check written to catch exactly this (#138).
 *
 * `[data-theme="dark"]` is read rather than the media query because it is the
 * *forced* dark set, which is what a dark artboard is: a drawing that is dark
 * regardless of the machine it is opened on. The two blocks declare the same
 * values, and reading the forced one means the artboard and the app agree for
 * the same reason rather than by coincidence.
 *
 * Applied by name rather than to everything the rule mentions, so a colour
 * that ever appeared there would still be carried as its own `light-dark()`
 * pair: resolving a half here is the one thing this file must leave to the
 * browser.
 *
 * @param {string} tokensCss the text of `src/ui/tokens.css`
 * @returns {Map<string, string>} token name to the whole declaration, `;` included
 */
function forcedDarkIn(tokensCss) {
  /** @type {Map<string, string>} */
  const overrides = new Map();

  const rule = tokensCss.match(/\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/);
  if (!rule) return overrides;

  for (const line of rule[1].split("\n")) {
    const declaration = line.trim();
    if (!/^--[\w-]+:\s*.+;$/.test(declaration)) continue;
    overrides.set(nameOf(declaration), declaration);
  }

  return overrides;
}

/**
 * The token a declaration declares, e.g. `"--shadow-raised"`.
 *
 * @param {string} declaration
 * @returns {string}
 */
function nameOf(declaration) {
  return declaration.slice(0, declaration.indexOf(":"));
}

/**
 * The palette block an artboard currently carries, or `null` if it has none.
 *
 * @param {string} artboard the artboard's full text
 * @returns {string | null}
 */
export function helmetPaletteIn(artboard) {
  const match = artboard.match(BLOCK_PATTERN);
  return match ? match[0] : null;
}

/**
 * The artboard with `block` inserted into its `<helmet><style>`, replacing
 * whatever generated block was already there.
 *
 * Idempotent by construction rather than by special-casing "already has it":
 * replacing the exact substring `helmetPaletteIn` found with the exact string
 * being inserted is a no-op the second time around, because the substring
 * being replaced and the replacement are then the same text. That is also why
 * this uses `indexOf`/`slice` instead of `String.replace(existing, block)` —
 * `replace`'s second argument treats `$1`-shaped substrings specially, and a
 * generated block that happened to hand-mirror one control character would
 * silently corrupt on rewrite. Splicing by index has no such reading of its
 * arguments.
 *
 * @param {string} artboard the artboard's full text
 * @param {string} block from `paletteBlockFor`
 * @returns {string}
 */
export function withPalette(artboard, block) {
  const existing = helmetPaletteIn(artboard);
  if (existing !== null) {
    const at = artboard.indexOf(existing);
    return artboard.slice(0, at) + block + artboard.slice(at + existing.length);
  }

  const styleOpen = artboard.match(/<helmet>\s*<style>/);
  if (!styleOpen || styleOpen.index === undefined) {
    throw new Error(
      "This artboard has no <helmet><style> block to carry a generated palette in.",
    );
  }

  const insertAt = styleOpen.index + styleOpen[0].length;
  return `${artboard.slice(0, insertAt)}\n${block}\n${artboard.slice(insertAt)}`;
}

/**
 * Every colour hex or `rgb()`/`rgba()` occurrence in an artboard, sorted into
 * the three buckets `scripts/check-design-bundle.js`'s classification report
 * needs (#138, acceptance criterion 1: "the count is reported, including the
 * ones that were already correct") — not only the violations, but the whole
 * count a person would have to read to believe the violations are all of
 * them:
 *
 * - `generated`: inside the palette block itself. It is the one place
 *   tokens.css's values are *meant* to be spelled out — that is the whole
 *   mechanism — so these are correct by construction, not merely excused.
 * - `canvas`: inside a `--canvas-*` custom-property declaration. Six
 *   artboards flatten `--color-scrim` composited over the page into a plain
 *   colour, because a static artboard cannot composite a translucent overlay
 *   the way a browser does; that is canvas staging, named and countable, not
 *   a product colour a token stands in for.
 * - `hardcoded`: everywhere else. This is the rule "an artboard names a
 *   token, not a colour" actually being broken — including the same hex
 *   reused as an ordinary colour elsewhere on an artboard that also, quite
 *   correctly, stages canvas with it.
 *
 * Each bucket carries `{ line, colour }` entries in the order the colours
 * appear, so a failing check can say where to go rather than only that
 * something is wrong.
 *
 * @param {string} artboard the artboard's full text
 * @returns {{
 *   generated: { line: number, colour: string }[],
 *   canvas: { line: number, colour: string }[],
 *   hardcoded: { line: number, colour: string }[],
 * }}
 */
export function classifyColoursIn(artboard) {
  const excluded = excludedRanges(artboard);
  /** @type {{ generated: {line: number, colour: string}[], canvas: {line: number, colour: string}[], hardcoded: {line: number, colour: string}[] }} */
  const buckets = { generated: [], canvas: [], hardcoded: [] };

  const lines = artboard.split("\n");
  let offset = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const matches = [];

    for (const re of [HEX_RE, RGB_RE]) {
      re.lastIndex = 0;
      let match;
      while ((match = re.exec(line)) !== null) {
        matches.push({ at: match.index, colour: match[0] });
      }
    }

    matches.sort((a, b) => a.at - b.at);
    for (const { at, colour } of matches) {
      const position = offset + at;
      const bucket = bucketFor(position, excluded);
      buckets[bucket].push({ line: i + 1, colour });
    }

    offset += line.length + 1; // +1 for the newline split() consumed
  }

  return buckets;
}

/**
 * Every colour hex or `rgb()`/`rgba()` occurrence in an artboard that breaks
 * the rule "an artboard names a token, not a colour" — `classifyColoursIn`'s
 * `hardcoded` bucket, exposed on its own because that is the one a failing
 * check actually needs to act on.
 *
 * @param {string} artboard the artboard's full text
 * @returns {{ line: number, colour: string }[]} in the order the colours appear
 */
export function hardcodedColoursIn(artboard) {
  return classifyColoursIn(artboard).hardcoded;
}

/**
 * The `[start, end)` character ranges of an artboard, tagged by which bucket
 * a colour occurring inside them belongs to: the generated palette block, and
 * every `--canvas-*` declaration. Anything not covered by either is
 * `"hardcoded"` by elimination, which is `bucketFor`'s job below.
 *
 * @param {string} artboard
 * @returns {{ range: [number, number], bucket: "generated" | "canvas" }[]}
 */
function excludedRanges(artboard) {
  /** @type {{ range: [number, number], bucket: "generated" | "canvas" }[]} */
  const ranges = [];

  const paletteBlock = helmetPaletteIn(artboard);
  if (paletteBlock !== null) {
    const at = artboard.indexOf(paletteBlock);
    ranges.push({ range: [at, at + paletteBlock.length], bucket: "generated" });
  }

  CANVAS_DECLARATION_RE.lastIndex = 0;
  let match;
  while ((match = CANVAS_DECLARATION_RE.exec(artboard)) !== null) {
    ranges.push({ range: [match.index, match.index + match[0].length], bucket: "canvas" });
  }

  return ranges;
}

/**
 * @param {number} position
 * @param {{ range: [number, number], bucket: "generated" | "canvas" }[]} ranges
 * @returns {"generated" | "canvas" | "hardcoded"}
 */
function bucketFor(position, ranges) {
  for (const { range, bucket } of ranges) {
    if (position >= range[0] && position < range[1]) return bucket;
  }
  return "hardcoded";
}

/**
 * @param {string} text
 * @returns {string} `text`, safe to splice into a `RegExp` literally
 */
function escapeForRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
