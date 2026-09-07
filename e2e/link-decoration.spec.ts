import {
  expect,
  test,
  type BrowserContext,
  type Locator,
  type Page,
} from "@playwright/test";
import { createMember, createSpaceFor, startSession } from "./session";
import { openMonths } from "./months";
import { createDatabase, databaseUrl } from "../src/db/connection";
import { categoriesTheSpaceCanSee } from "../src/db/categories";
import {
  planBudgetItemInSpace,
  planFixedItemInSpace,
} from "../src/db/budget-items";
import { recordMovementInSpace } from "../src/db/movements";
import {
  calendarDate,
  monthOf,
  type CalendarDate,
} from "../src/domain/calendar/month";
import type { Category } from "../src/domain/category/category";

// Deliberately not the signed-in fixture: every screen here reads real rows,
// which needs a session belonging to a Member the database really has.

/**
 * Every visible link inside something, named the way a person reading the
 * screen would name it, with what it is drawn with.
 *
 * Measured in a browser because that is the only place the question can be
 * answered: `link.source.test.ts` proves where the rule is *written*, and a
 * rule that is written and then overridden still draws an underline.
 *
 * It takes whatever holds the links rather than the page, because one of the
 * things #58 is about is a bottom sheet — and a sheet is measured on top of
 * the screen that opened it, so counting the page would count that screen's
 * links a second time.
 */
async function decoratedLinks(within: Page | Locator) {
  const links = within.locator("a:visible");
  const count = await links.count();
  const decorated: string[] = [];

  for (let i = 0; i < count; i += 1) {
    const link = links.nth(i);
    const drawn = await link.evaluate(
      (element) => getComputedStyle(element).textDecorationLine,
    );

    if (drawn !== "none") {
      const name = (await link.textContent())?.trim() || `link #${i}`;
      decorated.push(`${name} (${drawn})`);
    }
  }

  return { decorated, count };
}

/**
 * The day the run is standing in, in the zone the whole suite is pinned to
 * (`playwright.config.ts` fixes the browser and the server's header together).
 *
 * The Budget screen and the month's list both open on the Reader's own month
 * (`monthInView`), so it is the month everything below has to be seeded into:
 * a row planned anywhere else is a row on a screen nobody visits.
 */
function today(): CalendarDate {
  return calendarDate(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()),
  );
}

/**
 * One Category of the shipped catalogue, found by the key its name is
 * translated from.
 *
 * Asked of the store rather than written down here: the identifiers belong to
 * a migration, and a copy of one in a spec is a copy that stops agreeing with
 * it the day the catalogue is renumbered.
 */
function catalogued(categories: readonly Category[], slug: string): string {
  const found = categories.find(
    (category) =>
      category.label.kind === "catalogue" && category.label.slug === slug,
  );

  if (!found) {
    throw new Error(`The shipped catalogue has no "${slug}" to file against.`);
  }

  return found.id;
}

/**
 * A signed-in Member with a Space that has something on every screen: a Fixed
 * item, a Variable one, and an expense in the ledger.
 *
 * Written straight through the store rather than driven through the forms,
 * the way `hit-targets.spec.ts` seeds its invitation: planning and recording
 * are what `budget.spec.ts` and `movements.spec.ts` are for, and paying page
 * loads to arrive at a fixture buys nothing this spec measures. What it does
 * buy is the rows #58 names — an underlined item name, its "Alquiler · 1 sep"
 * line, a row of the plan, a row of the month's list — none of which a fresh
 * Space draws at all.
 */
async function aSpaceWithRowsOnIt(context: BrowserContext, baseURL: string) {
  const member = await createMember("Vera Sol");
  const space = await createSpaceFor(member.id, "Casa", "COP");
  await startSession(context, baseURL, member);

  const day = today();
  const month = monthOf(day);

  const { db, sql } = createDatabase(databaseUrl(), { max: 1 });
  try {
    const visible = await categoriesTheSpaceCanSee(db, space.id);
    const rent = catalogued(visible, "home.rent");
    const groceries = catalogued(visible, "food.groceries");

    // Minor units, the way the keypad counts them: $1.800.000,00 of rent,
    // $240.000,00 of groceries planned, and $60.000,00 of them spent.
    await planFixedItemInSpace(db, space, {
      spaceId: space.id,
      month,
      categoryId: rent,
      amount: 180_000_000,
      name: "Arriendo",
      // The first, because every month has one and February is not an
      // argument this spec wants to have.
      dueDay: 1,
    });

    await planBudgetItemInSpace(db, space, {
      spaceId: space.id,
      month,
      categoryId: groceries,
      amount: 24_000_000,
      // Called something, like every item since #79: the name is the row's
      // first line and the Category dropped to the one beneath it, so a row
      // without one is not a row this spec could find anything to underline on.
      name: "Súper de la semana",
    });

    // Dated today rather than on a chosen day of the month: a Movement is
    // money that already moved, so any later day would be refused, and the 1st
    // is a day the run is standing after only for eleven months of twelve.
    await recordMovementInSpace(
      db,
      { space, recordedBy: member.id, today: day },
      {
        spaceId: space.id,
        direction: "expense",
        categoryId: groceries,
        amount: 6_000_000,
        occurredOn: day,
        attributedTo: null,
        name: null,
      },
    );
  } finally {
    await sql.end();
  }

  return space;
}

test("not one link in the app is underlined", async ({
  page,
  context,
  baseURL,
}) => {
  const space = await aSpaceWithRowsOnIt(context, baseURL!);

  // In the order a thumb reaches them. Five of the six are an artboard on the
  // canvas -- Espacios, CrearEspacio, Presupuesto (which is what
  // `/espacios/{id}` is: `presupuesto/page.tsx` redirects to it), Movimientos
  // and CargarGasto -- and not one artboard draws an underline anywhere.
  // Miembros has no artboard and is here because #58 names its row.
  const screens = [
    "/espacios",
    "/espacios/nuevo",
    `/espacios/${space.id}`,
    `/espacios/${space.id}/movimientos`,
    `/espacios/${space.id}/movimientos/nuevo`,
    `/espacios/${space.id}/miembros`,
  ];

  /**
   * How many links each of them draws, and what the number is made of. Pinned
   * rather than merely greater than nothing, for the reason `hit-targets.spec`
   * pins its counts: "more than zero" is satisfied by the tab bar alone, so a
   * screen that quietly stopped rendering the rows this is about would go on
   * passing green with nothing left on it to underline.
   */
  const expected: Record<string, number> = {
    // The one Space card and the way to a new one. No tab bar: the list
    // belongs to no Space (#5), and the way out is a button rather than a
    // link everywhere it appears.
    "/espacios": 2,
    // Cancelar, back to the list. A form of one field has nowhere else to go.
    "/espacios/nuevo": 1,
    // The tab bar's four tabs and the raised button between them, the Fixed
    // item's row, the one way into the plan (#80) and the row to who shares
    // this Space (#9). On a Space with nothing planned it would be seven: the
    // same five, the way in and the Members row, because the Fixed item's row
    // is the only one of the eight the plan itself puts on the screen.
    //
    // Eight and no longer nine: there were two ways into the plan, one per
    // kind, and #80 made them one -- the kind is a question the form asks now
    // rather than a button a person has to choose between. It was ten before
    // #63, which moved the Variable item's row inside its Category's tray; a
    // closed `<details>` draws nothing, so that row is not a link on this
    // screen until somebody opens it. It is read below instead, where it is
    // drawn -- because #58 is about every link in the app and a link nobody
    // counted is a link nobody checked.
    //
    // Eight through #81 as well, which moved that way in from the foot of the
    // screen to above both lists. It is a row in a card of its own now and the
    // whole-plan empty state moved in beside it, so the screen lost one group
    // and gained one -- and a group is not a link. The sentence never was one
    // either.
    [`/espacios/${space.id}`]: 8,
    // The same five and the one Movement's row. The step back to last month
    // went with the rest of the walker (#61): the month is a pill now, and a
    // pill is a button until it is opened.
    [`/espacios/${space.id}/movimientos`]: 6,
    // Cancelar and nothing else. The entry screen drops the tab bar: it is
    // one question asked at a till, and the way out of it is answering it.
    [`/espacios/${space.id}/movimientos/nuevo`]: 1,
    // The tab bar alone. The Members are named rather than linked, and the
    // free seat is offered by a form.
    [`/espacios/${space.id}/miembros`]: 5,
    // The fourteen months the pill offers: the twelve of the year in view and
    // one either side of it (`monthsToPlan`).
    "el mes": 14,
    // The one Variable item, in the tray its Category's row opens (#63).
    "el plan de una categoría": 1,
  };

  const underlined: string[] = [];
  const counted: Record<string, number> = {};

  /** Reads whatever is on the screen now, under a name a failure carries. */
  const read = async (what: string, within: Page | Locator = page) => {
    const { decorated, count } = await decoratedLinks(within);

    counted[what] = count;
    underlined.push(...decorated.map((link) => `${what}: ${link}`));
  };

  // Every screen is read before anything is asserted, so a failure names all
  // of them rather than only the first one to go wrong.
  for (const screen of screens) {
    await page.goto(screen);
    await read(screen);
  }

  // And the two places links are drawn that no address reaches. First the
  // sheet the month pill opens, whose rows are links because a month is a
  // place (#40). Read through the dialog rather than through the page — the
  // screen underneath is still visible, so counting the page would count the
  // Budget screen's eight a second time.
  await page.goto(`/espacios/${space.id}`);
  const sheet = await openMonths(page);
  await read("el mes", sheet);

  // Then the tray a Category's row opens, which holds the items that Category
  // expects (#63). Read through the opened row for the same reason, and
  // reached by tapping the row because that is the only way there is: the
  // disclosure is native and carries no address of its own.
  await page.goto(`/espacios/${space.id}`);
  const variables = page.getByRole("group", { name: "Variables" });
  await variables.locator("summary").first().click();
  await read("el plan de una categoría", variables.locator("details[open]"));

  expect(underlined).toEqual([]);
  expect(counted).toEqual(expected);
});
