import path from "node:path";
import { openSync, type Font } from "fontkit";

type Document = PDFKit.PDFDocument;
type Run = { font: string; value: string; width: number };
type Line = { runs: Run[]; width: number; height: number };

const paths = {
  regular: path.join(process.cwd(), "node_modules/@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff"),
  bold: path.join(process.cwd(), "node_modules/@fontsource/noto-sans/files/noto-sans-latin-700-normal.woff"),
  unicode: path.join(process.cwd(), "src/reports/fonts/unifont-17.0.05.otf"),
  upper: path.join(process.cwd(), "src/reports/fonts/unifont_upper-17.0.05.otf"),
};
const fonts = Object.entries(paths).map(([name, file]) => {
  const font = openSync(file);
  if (!("hasGlyphForCodePoint" in font)) throw new Error("A report font must be a single face.");
  return { name, file, font: font as Font };
});

/** Shared measurement and painting, including offline fallbacks for own names. */
export function pdfText(doc: Document) {
  for (const face of fonts) doc.registerFont(face.name, face.file);
  function fontFor(character: string, heavy: boolean) {
    const code = character.codePointAt(0);
    const preferred = fonts.find((face) => face.name === (heavy ? "bold" : "regular"));
    if (code === undefined || !preferred) throw new Error("A character and a report font are required.");
    if (preferred.font.hasGlyphForCodePoint(code)) return preferred.name;
    const fallback = fonts.find((face) => face.font.hasGlyphForCodePoint(code));
    if (!fallback) throw new Error(`The report cannot silently omit Unicode U+${code.toString(16)}.`);
    return fallback.name;
  }
  function runsOf(value: string, size: number, heavy: boolean) {
    const runs: Run[] = [];
    for (const character of value) {
      const font = fontFor(character, heavy);
      const last = runs.at(-1);
      if (last?.font === font) last.value += character;
      else runs.push({ font, value: character, width: 0 });
    }
    for (const run of runs) run.width = doc.font(run.font).fontSize(size).widthOfString(run.value);
    return runs;
  }
  function layout(value: string, width: number, size: number, heavy: boolean): Line[] {
    const lines: Line[] = [];
    let line: Line = { runs: [], width: 0, height: 0 };
    const finish = () => {
      line.height = Math.max(line.height, doc.font(heavy ? "bold" : "regular").fontSize(size).currentLineHeight(true));
      lines.push(line);
      line = { runs: [], width: 0, height: 0 };
    };
    const append = (runs: Run[]) => {
      for (const run of runs) {
        const last = line.runs.at(-1);
        if (last?.font === run.font) last.value += run.value;
        else line.runs.push({ ...run });
        line.width += run.width;
        line.height = Math.max(line.height, doc.font(run.font).fontSize(size).currentLineHeight(true));
      }
    };
    for (const token of value.split(/(\n|[^\S\n]+)/u)) {
      if (!token) continue;
      if (token === "\n") { finish(); continue; }
      const runs = runsOf(token, size, heavy);
      const tokenWidth = runs.reduce((sum, run) => sum + run.width, 0);
      if (line.width + tokenWidth > width && line.runs.length > 0) finish();
      if (token.trim() === "" && line.runs.length === 0) continue;
      if (tokenWidth <= width) append(runs);
      else {
        // Only a word longer than a column breaks within itself; nothing is cut.
        for (const character of token) {
          const part = runsOf(character, size, heavy);
          const length = part.reduce((sum, run) => sum + run.width, 0);
          if (line.width + length > width && line.runs.length > 0) finish();
          append(part);
        }
      }
    }
    if (line.runs.length > 0 || lines.length === 0) finish();
    return lines;
  }
  function height(value: string, width: number, size: number, heavy = false) {
    return layout(value, width, size, heavy).reduce((total, line) => total + line.height, 0);
  }
  function draw(value: string, x: number, y: number, width: number, size: number, heavy: boolean, color: string, align: "left" | "right") {
    const lines = layout(value, width, size, heavy);
    let top = y;
    for (const line of lines) {
      let left = x + (align === "right" ? width - line.width : 0);
      for (const run of line.runs) {
        doc.font(run.font).fontSize(size).fillColor(color).text(run.value, left, top, { lineBreak: false });
        left += doc.widthOfString(run.value);
      }
      top += line.height;
    }
    return top - y;
  }
  return { height, draw };
}
