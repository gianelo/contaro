import PDFDocument from "pdfkit";
import path from "node:path";
import { formatMoney, type Money } from "@/domain/money/money";
import { spent } from "@/domain/movement/movement";
import { categoryLabel } from "@/i18n/category";
import { t } from "@/i18n";
import { pdfText } from "./pdf-text";
import type { ReportWithMembers } from "@/app/espacios/[id]/informe/read";

const regular = path.join(process.cwd(), "node_modules/@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff");
const ink = "#1c1c1e";
const muted = "#6c6c70";
const green = "#087f6b";
const red = "#c92828";
const margin = 40;
const width = 515.28;
const bottom = 752;

type Column = { label: string; share: number; align?: "left" | "right" };

/** In-memory, Node-only renderer. No files, browser, network or retained report. */
export async function renderMonthPdf(report: ReportWithMembers, generatedAt: Date): Promise<Uint8Array> {
  const doc = new PDFDocument({ size: "A4", margin: 0, bufferPages: true, autoFirstPage: false, font: regular,
    info: { Title: `${t("report.title")} - ${report.space.name} - ${report.closed.month}`, CreationDate: generatedAt },
    lang: "es-CO",
  });
  const typography = pdfText(doc);
  const chunks: Buffer[] = [];
  const finished = new Promise<Uint8Array>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
    doc.on("error", reject);
  });
  const amount = (value: Money) => formatMoney(value, report.space.locale);
  const date = (day: string) => new Intl.DateTimeFormat(report.space.locale, { dateStyle: "short", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));
  const period = new Intl.DateTimeFormat(report.space.locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${report.closed.month}-01T12:00:00Z`));
  const members = new Map(report.members.map((member) => [member.id, member.name]));
  const categories = new Map(report.categories.map((line) => [line.category.id, categoryLabel(line.category.label)]));
  const nameOf = (id: string) => {
    const name = members.get(id);
    if (name === undefined) throw new Error("The report names a Member outside its Space.");
    return name;
  };
  const categoryOf = (id: string | null) => {
    if (id === null) return "-";
    const label = categories.get(id);
    if (label === undefined) throw new Error("The report names an unavailable Category.");
    return label;
  };
  let y = 0;
  let section = "";
  function text(value: string, x: number, top: number, w: number, size = 10, heavy = false, color = ink, align: "left" | "right" = "left") {
    return typography.draw(value, x, top, w, size, heavy, color, align);
  }
  function page(title: string) {
    section = title;
    doc.addPage();
    text("contaro", margin, 25, width, 17, true, green);
    const titleHeight = text(title, margin, 54, width, 23, true);
    const identityHeight = text(`${report.space.name} / ${period} / ${report.space.currency}`, margin, 59 + titleHeight, width, 10, false, muted);
    y = 65 + titleHeight + identityHeight;
    text(t("report.closed"), margin, y, width, 9, true, green);
    y += 25;
  }
  function ensure(height: number) {
    if (y + height > bottom) page(section);
  }
  function paragraph(value: string, size = 9, color = muted) {
    const h = typography.height(value, width, size);
    ensure(h + 10);
    y += text(value, margin, y, width, size, false, color) + 10;
  }
  function heading(label: string) {
    ensure(45);
    y += text(label, margin, y, width, 14, true) + 12;
  }
  function table(title: string, columns: readonly Column[], rows: readonly (readonly string[])[], empty: string) {
    function header() {
      heading(title);
      doc.font("bold").fontSize(8);
      const h = Math.max(24, ...columns.map((column) => typography.height(column.label, width * column.share - 14, 8, true) + 12));
      doc.roundedRect(margin, y, width, h, 4).fill("#f2f2f7");
      let x = margin;
      for (const column of columns) {
        text(column.label, x + 7, y + 6, width * column.share - 14, 8, true, muted, column.align);
        x += width * column.share;
      }
      y += h;
    }
    ensure(90);
    header();
    if (rows.length === 0) paragraph(empty);
    for (const row of rows) {
      doc.font("regular").fontSize(8.5);
      const h = Math.max(24, ...columns.map((column, i) => typography.height(row[i] ?? "", width * column.share - 14, 8.5) + 10));
      if (y + h > bottom) {
        page(section);
        header();
      }
      let x = margin;
      columns.forEach((column, i) => {
        text(row[i] ?? "", x + 7, y + 5, width * column.share - 14, 8.5, false, ink, column.align);
        x += width * column.share;
      });
      y += h;
      doc.moveTo(margin, y).lineTo(margin + width, y).lineWidth(0.4).stroke("#d1d1d6");
    }
    y += 14;
  }
  function bars(title: string, rows: readonly { label: string; value: Money; color: string }[]) {
    heading(title);
    const maximum = Math.max(1, ...rows.map((row) => row.value.amount));
    if (rows.length === 0) paragraph(t("report.noCategories"));
    for (const row of rows) {
      doc.font("regular").fontSize(9);
      const h = Math.max(22, typography.height(row.label, 135, 9), typography.height(amount(row.value), 155, 9, true));
      ensure(h + 12);
      text(row.label, margin, y, 135, 9);
      const trackY = y + h / 2 - 3;
      doc.roundedRect(margin + 145, trackY, 200, 5, 2).fill("#f2f2f7");
      const length = 200 * row.value.amount / maximum;
      if (length > 0) doc.roundedRect(margin + 145, trackY, length, 5, 2).fill(row.color);
      text(amount(row.value), margin + 355, y, 160, 9, true, ink, "right");
      y += h + 12;
    }
  }
  try {
    page(t("report.title"));
    const net = amount(report.net);
    const wideNet = doc.font("bold").fontSize(23).widthOfString(net) > 270;
    const netWidth = wideNet ? width - 28 : 270;
    const netHeight = typography.height(net, netWidth, 23, true);
    const descriptionY = 30 + netHeight + 7;
    const leftHeight = descriptionY + typography.height(t("report.net"), netWidth, 8) + 14;
    const incomeHeight = typography.height(`${t("report.income")}\n${amount(report.income)}`, wideNet ? width / 2 - 28 : 205, 10, true);
    const expenseHeight = typography.height(`${t("report.spent")}\n${amount(report.totals.spent)}`, wideNet ? width / 2 - 28 : 205, 10, true);
    const cardHeight = wideNet ? leftHeight + Math.max(incomeHeight, expenseHeight) + 14 : Math.max(leftHeight, 16 + incomeHeight + 12 + expenseHeight + 14);
    doc.roundedRect(margin, y, width, cardHeight, 12).fill("#e3f2ee");
    text(t("report.overview"), margin + 14, y + 12, netWidth, 9, true, green);
    text(net, margin + 14, y + 30, netWidth, 23, true, report.net.amount < 0 ? red : green);
    text(t("report.net"), margin + 14, y + descriptionY, netWidth, 8, false, muted);
    text(`${t("report.income")}\n${amount(report.income)}`, wideNet ? margin + 14 : margin + 295, y + (wideNet ? leftHeight : 16), wideNet ? width / 2 - 28 : 205, 10, true);
    text(`${t("report.spent")}\n${amount(report.totals.spent)}`, margin + 295, y + (wideNet ? leftHeight : 28 + incomeHeight), wideNet ? width / 2 - 28 : 205, 10, true);
    y += cardHeight + 18;
    heading(t("report.plan"));
    const figures = [
      { label: t("report.expected"), value: amount(report.totals.expected) },
      { label: t("report.spent"), value: amount(report.totals.spent) },
      { label: t("report.remaining"), value: report.remaining === null ? "-" : amount(report.remaining) },
    ];
    let figureHeight = 0;
    figures.forEach((figure, i) => {
      text(figure.label, margin + i * width / 3, y, width / 3 - 10, 8, false, muted);
      figureHeight = Math.max(figureHeight, text(figure.value, margin + i * width / 3, y + 19, width / 3 - 10, 13, true));
    });
    y += 28 + figureHeight;
    if (report.totals.share !== null) {
      doc.roundedRect(margin, y, width, 6, 3).fill("#f2f2f7");
      const length = width * Math.min(report.totals.share, 1);
      if (length > 0) doc.roundedRect(margin, y, length, 6, 3).fill(report.totals.over ? red : green);
      y += 17;
    }
    paragraph(report.remaining === null ? t("report.noPlan") : t("report.planNote"));
    if (report.balance) paragraph(`${t(report.balance.kind === "surplus" ? "report.surplus" : "report.deficit")}: ${amount(report.balance.amount)}`);
    else if (report.remaining !== null) paragraph(t("report.even"));
    heading(t("report.pace"));
    const standing = report.pace?.standing;
    paragraph(!standing ? t("report.noPace") : standing.kind === "onPace" ? t("report.pace.onPace") : t(standing.kind === "ahead" ? "report.pace.ahead" : "report.pace.behind", { amount: amount(standing.by) }));
    bars(t("report.comparison"), [
      { label: t("report.income"), value: report.income, color: "#2d5e94" },
      { label: t("report.spent"), value: report.totals.spent, color: muted },
    ]);
    // Directly filed expenses only: parent roll-ups are not additive chart bars.
    bars(t("report.categories"), report.categories.map((line) => ({
      label: categoryLabel(line.category.label),
      value: spent(report.movements.filter((movement) => movement.categoryId === line.category.id), report.space.currency),
      color: green,
    })).filter((row) => row.value.amount > 0));
    paragraph(t("report.closedBy", { day: date(report.closed.closedOn), name: nameOf(report.closed.closedBy) }));

    page(t("report.plan"));
    table(t("report.planComparison"), [
      { label: t("report.category"), share: .31 },
      { label: t("report.expected"), share: .23, align: "right" },
      { label: t("report.spent"), share: .23, align: "right" },
      { label: t("report.difference"), share: .23, align: "right" },
    ], report.categories.map((line) => [categoryLabel(line.category.label), amount(line.expected), amount(line.spent), amount(line.difference)]), t("report.noPlan"));
    paragraph(t("report.categoryNote"));
    paragraph(`${t("report.total")}: ${t("report.expected")} ${amount(report.totals.expected)} / ${t("report.spent")} ${amount(report.totals.spent)}`);
    const payments = new Map(report.fixed.map(({ item, paid }) => [item.id, paid]));
    table(t("report.allPlan"), [
      { label: t("report.item"), share: .42 },
      { label: t("report.type"), share: .13 },
      { label: t("report.amount"), share: .22, align: "right" },
      { label: t("report.payment"), share: .23 },
    ], report.plan.map((item) => [
      `${item.name}\n${categoryOf(item.categoryId)}`,
      t(item.kind === "fixed" ? "report.fixed" : "report.variable"), amount(item.amount),
      item.kind === "fixed" ? t(payments.get(item.id) ? "report.paid" : "report.neverPaid") : "-",
    ]), t("report.noPlan"));
    paragraph(t("report.planNote"));

    page(t("report.movements"));
    table(t("report.detail"), [
      { label: t("report.date"), share: .14 },
      { label: t("report.movement"), share: .24 },
      { label: t("report.category"), share: .16 },
      { label: t("report.recorder"), share: .14 },
      { label: t("report.direction"), share: .12 },
      { label: `${t("report.amount")} ${report.space.currency}`, share: .20, align: "right" },
    ], [...report.movements].sort((a, b) => a.occurredOn.localeCompare(b.occurredOn) || a.id.localeCompare(b.id)).map((movement) => [
      date(movement.occurredOn), movement.name ?? (movement.categoryId === null ? t("report.income") : categoryOf(movement.categoryId)), categoryOf(movement.categoryId), nameOf(movement.recordedBy),
      t(movement.direction === "income" ? "report.income" : "report.expense"), amount(movement.amount),
    ]), t("report.noMovements"));
    paragraph(`${t("report.income")}: ${amount(report.income)} / ${t("report.spent")}: ${amount(report.totals.spent)} / ${t("report.overview")}: ${amount(report.net)}`, 10, ink);
    paragraph(t("report.complete"));

    const { start, count } = doc.bufferedPageRange();
    const when = new Intl.DateTimeFormat(report.space.locale, { dateStyle: "short", timeStyle: "short", timeZone: "UTC" }).format(generatedAt);
    for (let n = start; n < start + count; n++) {
      doc.switchToPage(n);
      doc.moveTo(margin, 783).lineTo(margin + width, 783).stroke("#d1d1d6");
      text(`${t("report.generated", { when })} (UTC)`, margin, 796, width - 75, 7, false, muted);
      text(`${n + 1} / ${count}`, margin + width - 70, 796, 70, 7, false, muted, "right");
    }
    doc.end();
  } catch (error) {
    doc.destroy();
    throw error;
  }
  return finished;
}
