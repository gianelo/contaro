import { calendarDate, month } from "@/domain/calendar/month";
import { money } from "@/domain/money/money";
import { reportOfClosedMonth } from "@/domain/space/report";
import type { BudgetItem } from "@/domain/budget/budget";
import type { Movement } from "@/domain/movement/movement";

/** Synthetic inputs shared by report seam tests, never production data. */
export function monthlyFixture() {
  const space = { id: "home", name: "Casa", currency: "COP", locale: "es-CO", createdBy: "ana" } as const;
  const closed = { spaceId: space.id, month: month("2026-09"), closedBy: "ana", closedOn: calendarDate("2026-10-03") };
  const categories = [{ id: "food", spaceId: null, parentId: null, label: { kind: "catalogue", slug: "food" } }] as const;
  const plan: BudgetItem[] = [
    { id: "plan", spaceId: space.id, month: closed.month, kind: "variable", categoryId: "food", name: "Mercado", amount: money(5_0000_00, "COP") },
    { id: "fixed", spaceId: space.id, month: closed.month, kind: "fixed", categoryId: "food", name: "Suscripción sin pagar", amount: money(10_000, "COP"), dueOn: calendarDate("2026-09-05"), payment: null },
  ];
  const movements: Movement[] = [
    { id: "expense", spaceId: space.id, direction: "expense", categoryId: "food", name: "Compra mensual", amount: money(4_800_000, "COP"), occurredOn: calendarDate("2026-09-02"), recordedBy: "beto", attributedTo: "beto", carriedFrom: null },
    { id: "salary", spaceId: space.id, direction: "income", categoryId: null, name: "Ingreso mensual", amount: money(5_100_000, "COP"), occurredOn: calendarDate("2026-09-01"), recordedBy: "ana", attributedTo: "ana", carriedFrom: null },
  ];
  return { space, closed, categories, items: plan, movements, members: [{ id: "ana", name: "Ana" }, { id: "beto", name: "Beto" }] };
}

export function monthlyReport() {
  const source = monthlyFixture();
  return { ...reportOfClosedMonth(source), members: source.members };
}
