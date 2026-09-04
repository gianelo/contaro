/**
 * A Budget: the plan of expenses a Space expects to make in a given month, made
 * up of Budget items (see CONTEXT.md).
 *
 * The plan has no row of its own and no moment it is created. A Budget *is*
 * the items a Space has for a month, so it comes into existence with the first
 * one and needs nobody to declare it first: asking a Member to create an empty
 * plan before they can plan anything is a tollbooth in front of the only act
 * that matters. What the close of a month freezes (ADR-0002) is the month —
 * its Movements as much as its plan — so that does not hang here either.
 *
 * A Budget is a plan and never a limit: it never refuses a Movement, and
 * measuring real spending against it is #11.
 */

import {
  dayOf,
  daysBetween,
  isMonth,
  UnreadableDateError,
  type CalendarDate,
  type Month,
  type MonthSoFar,
} from "../calendar/month";
import { categoriesVisibleTo, type Category } from "../category/category";
import type { CurrencyCode } from "../money/currency";
import { money, zero, type Money } from "../money/money";
import { spent, type Movement, type MovementDraft } from "../movement/movement";
import type { Space } from "../space/space";

/**
 * One expected expense inside a Budget: an amount for a Category, in a month.
 *
 * What both kinds carry, and the whole of what they have in common. Every
 * figure a month is read by — what it expects, what each Category expects — is
 * arithmetic on exactly these fields, so it is asked of the two kinds at once
 * and never twice.
 */
type PlannedAmount = {
  id: string;
  spaceId: string;
  month: Month;
  categoryId: string;
  amount: Money;
};

/**
 * An expectation a Category's Movements count against, such as food or leisure.
 *
 * It carries no due date and no paid state, and that is the difference between
 * the kinds rather than an omission: nobody pays "comida", they shop under it
 * eleven times, and there is nothing on one to mark.
 */
export type VariableItem = PlannedAmount & { kind: "variable" };

/**
 * A known amount on a known day, such as rent or a subscription.
 *
 * `movementId` is how "paid" is said, and it is deliberately the Movement
 * itself rather than a flag beside it. A boolean and a Movement are two facts
 * that have to agree, and two facts that have to agree are two facts that
 * eventually will not — a `paid` left true by a half-finished write would show
 * a row as settled with no money anywhere in the ledger. Held this way, "paid"
 * and "there is a Movement for it" are one thing, and marking an item paid
 * twice is a column the database can refuse (`isPaid`).
 */
export type FixedItem = PlannedAmount & {
  kind: "fixed";
  /**
   * What the row is called. A Fixed item is read by its name and not by its
   * Category: three subscriptions under "Suscripciones" are three rows a
   * person has to tell apart, and the Category is the quieter second line.
   */
  name: string;
  /**
   * The day it falls due. Always inside `month`, because it is built out of it
   * (`dayOf`) rather than typed — so a plan cannot hold a due date belonging
   * to a month it is not on.
   */
  dueOn: CalendarDate;
  /** The Movement marking it paid created, or null while it is pending. */
  movementId: string | null;
};

/**
 * One item of a month's plan. "Every item is either fixed or variable"
 * (CONTEXT.md), said as a type so nothing can be neither or both.
 */
export type BudgetItem = VariableItem | FixedItem;

/** An item as it is planned, before the database gives it an id. */
export type NewBudgetItem = Omit<VariableItem, "id">;

/** A Fixed item as it is planned, before the database gives it an id. */
export type NewFixedItem = Omit<FixedItem, "id">;

/**
 * What arrives from the entry screen: strings and a number, none of them
 * trusted. The month is a plain string because a URL carries any string at
 * all, and the amount is minor units because the keypad counts in them.
 */
export type BudgetItemDraft = {
  spaceId: string;
  month: string;
  categoryId: string;
  amount: number;
};

/**
 * The same answers plus the two only a Fixed item is asked for.
 *
 * `dueDay` and not a date: the screen already knows which month is being
 * planned, so asking for a whole date would be offering a person the chance to
 * contradict it. A day of the month cannot disagree with the month it is on.
 */
export type FixedItemDraft = BudgetItemDraft & {
  name: string;
  dueDay: number;
};

/**
 * What a correction may change, and by its absence what it may not. An item
 * never moves between months or Spaces: that is not a correction of this plan
 * but an item on another one.
 */
export type BudgetItemAmendment = {
  categoryId?: string;
  amount?: number;
};

/**
 * The Space a plan is being made in, and the Categories it can see.
 *
 * Handed in rather than looked up, for the reason `Recording` is: it is what
 * lets every rule here be driven directly, and it keeps the domain free of the
 * database (ADR-0005). No clock: a plan is about a month somebody named, not
 * about the day it was written on.
 */
export type Planning = {
  space: Space;
  categories: readonly Category[];
};

/**
 * The point past which an expectation is a slipped thumb rather than a plan.
 *
 * The same ceiling as a Movement's, and deliberately: a plan and the spending
 * measured against it are compared all month (#11), and a plan that could hold
 * a figure no Movement can reach would be an expectation nothing could ever
 * meet.
 */
export const MAX_BUDGET_ITEM_AMOUNT = 999_999_999_999;

/**
 * Which answer on the entry screen was the bad one. Its own type for the
 * reason `MovementField` is: the domain throws over it and the screen switches
 * over it to say what went wrong, and a field added to one list and not the
 * other is a refusal nobody is ever told about.
 */
export type BudgetItemField =
  | "amount"
  | "category"
  | "month"
  | "space"
  | "name"
  | "dueDay";

/**
 * Thrown when an item cannot be planned or corrected as asked. `field` says
 * which answer was the bad one, so a screen can point at the input.
 */
export class UnplannableBudgetItemError extends Error {
  readonly field: BudgetItemField;

  constructor(field: BudgetItemField, reason: string) {
    super(`This Budget item cannot be planned: ${reason}.`);
    this.name = "UnplannableBudgetItemError";
    this.field = field;
  }
}

/**
 * What a Member's answers become, checked against the Space being planned for.
 *
 * Nothing here refuses a second item on a Category that already has one. That
 * is not an oversight and not a duplicate: several items on one Category are
 * how a person plans a month in weeks, and they behave as a single item of
 * their combined amount (`expectedByCategory`).
 */
export function planItem(
  draft: BudgetItemDraft,
  planning: Planning,
): NewBudgetItem {
  inTheSameSpace(draft.spaceId, planning.space.id);

  return {
    kind: "variable",
    spaceId: planning.space.id,
    month: whichMonth(draft.month),
    categoryId: category(draft.categoryId, planning),
    amount: amount(draft.amount, planning.space.currency),
  };
}

/**
 * The longest a Fixed item's name may be. The same ceiling a Space's name has,
 * and for the same reason: it is a label on a row, not a description.
 */
export const MAX_FIXED_ITEM_NAME_LENGTH = 60;

/**
 * A Fixed item planned, held to every rule a Variable one is held to and to
 * the two more its shape asks for.
 *
 * It starts pending, because nothing has been paid: `movementId` is null and
 * there is no answer on the entry screen that could make it anything else.
 * Marking it paid is a separate act with its own confirmation (`paymentFor`),
 * which is the whole point of the kind — the money comes into existence when
 * somebody says it moved, not when they wrote down that it would.
 */
export function planFixedItem(
  draft: FixedItemDraft,
  planning: Planning,
): NewFixedItem {
  inTheSameSpace(draft.spaceId, planning.space.id);

  const month = whichMonth(draft.month);

  return {
    kind: "fixed",
    spaceId: planning.space.id,
    month,
    categoryId: category(draft.categoryId, planning),
    amount: amount(draft.amount, planning.space.currency),
    name: name(draft.name),
    dueOn: dueOn(month, draft.dueDay),
    movementId: null,
  };
}

/**
 * Whether a Fixed item has been paid.
 *
 * One reading of `movementId` rather than a field, so nothing anywhere can
 * hold the answer separately from the Movement that is the answer.
 */
export function isPaid(item: NewFixedItem | FixedItem): boolean {
  return item.movementId !== null;
}

/** The Space a Fixed item is being paid in, and the day it is being paid on. */
export type Paying = {
  space: Space;
  /**
   * The day it is where the person tapping is standing (ADR-0018).
   *
   * Theirs and not the server's, unlike the clock a hand-typed Movement is
   * held against. That one is a *bound* on a day somebody typed, and it is
   * deliberately the blunter answer; here nobody types a day at all, so there
   * is nothing to bound -- this *is* the date the money is recorded on. At
   * nine at night on the 30th in Bogota the server is already in the next
   * month, and September's rent would land as an October expense that
   * September's own plan could never see.
   */
  today: CalendarDate;
};

/**
 * Thrown when a Fixed item that has already been paid is marked paid again.
 *
 * Its own error and not an `UnplannableBudgetItemError`, because it points at
 * no answer on any screen: nothing was mistyped, the row simply has a Movement
 * already. A screen catching it has one honest thing to say, which is that it
 * is paid — and #13 asks that the second tap create no second Movement.
 */
export class FixedItemAlreadyPaidError extends Error {
  constructor(item: FixedItem) {
    super(`${item.name} was already paid by Movement ${item.movementId}.`);
    this.name = "FixedItemAlreadyPaidError";
  }
}

/**
 * What marking a Fixed item paid asks the ledger to record.
 *
 * A draft and not a Movement: every rule about what may be recorded in a Space
 * lives in `recordMovement`, and a second path into the ledger that built its
 * own rows would be a second place for those rules to stop being true. This
 * only says which expense the plan is asking for.
 *
 * Dated today -- the Reader's today (ADR-0018) -- and not on the day it fell
 * due. The due date is when the plan expected the money to move; the Movement
 * is when somebody says it did, and a subscription charged four days late is
 * an expense of the day it was charged.
 *
 * Attributed to nobody in particular, which `recordMovement` reads as the
 * Member doing the recording — the same default the entry screen has, and what
 * the confirmation says it will be before anything is created.
 */
export function paymentFor(item: FixedItem, paying: Paying): MovementDraft {
  inTheSameSpace(item.spaceId, paying.space.id);

  if (isPaid(item)) throw new FixedItemAlreadyPaidError(item);

  return {
    spaceId: paying.space.id,
    direction: "expense",
    categoryId: item.categoryId,
    amount: item.amount.amount,
    occurredOn: paying.today,
    attributedTo: null,
  };
}

/**
 * How near a pending Fixed item is to its day, or nothing while it is far off.
 *
 * The shape of the four answers and not the words for them: what a person
 * reads is copy, and copy is the interface's (`budget.fixed.due.*`). What is a
 * rule is which of the four it is, and that is decided once here.
 *
 * "Vence en 1 días" is a sentence nobody says, so the two days a person has a
 * word for are named rather than counted. A day already past is louder rather
 * than quieter: an unpaid item behind its date is the one a Member most needs
 * telling about, and going grey again on the 23rd would hide exactly that.
 *
 * Nothing at all once it is paid. The badge says "Pagado", and a line counting
 * down to a day that no longer matters is noise beside it.
 */
export type DueNotice =
  | { kind: "overdue" }
  | { kind: "today" }
  | { kind: "tomorrow" }
  | { kind: "soon"; days: number };

/**
 * How near is near enough to say so.
 *
 * Five days: far enough that a Member has time to move money, close enough
 * that the line is not amber for most of the month. The canvas draws the 22nd
 * warned and the 25th quiet with the 18th being lived in, which is what this
 * reproduces.
 */
const DAYS_THAT_COUNT_AS_SOON = 5;

export function dueNotice(
  item: FixedItem,
  today: CalendarDate,
): DueNotice | null {
  if (isPaid(item)) return null;

  const days = daysBetween(today, item.dueOn);

  if (days < 0) return { kind: "overdue" };
  if (days === 0) return { kind: "today" };
  if (days === 1) return { kind: "tomorrow" };

  return days <= DAYS_THAT_COUNT_AS_SOON ? { kind: "soon", days } : null;
}

/**
 * An item as a correction leaves it, held to every rule the planning was held
 * to.
 *
 * A Budget stays editable throughout its month (CONTEXT.md), and nothing here
 * asks whether the month is still open. The close is what shuts editing down,
 * it freezes a month's Movements as much as its plan, and it has not been
 * built yet -- so it will refuse this in one place, above the domain, rather
 * than growing a second half-answer here that would then have to agree with it.
 *
 * Neither the month nor the Space is a change: an item on another month is not
 * a correction of this plan, it is an item on another one. They are absent
 * from `BudgetItemAmendment`, so that is a refusal the type makes.
 *
 * A Fixed item is refused outright, and the refusal is here rather than left
 * to the type alone. #13 gave a Fixed item a name, a day it falls due on and a
 * Movement, and gave it no correction screen; a correction shaped for the
 * other kind reaching one would answer three questions it was never asked --
 * silently, by leaving them out of what it wrote back.
 */
export function amendItem(
  item: BudgetItem,
  changes: BudgetItemAmendment,
  planning: Planning,
): VariableItem {
  inTheSameSpace(item.spaceId, planning.space.id);

  if (item.kind === "fixed") {
    throw new UnplannableBudgetItemError(
      "space",
      "a Fixed item is not corrected here",
    );
  }

  return {
    ...item,
    categoryId:
      changes.categoryId === undefined
        ? item.categoryId
        : category(changes.categoryId, planning),
    amount:
      changes.amount === undefined
        ? item.amount
        : amount(changes.amount, planning.space.currency),
  };
}

/**
 * What one Category is expected to cost this month, once per Category.
 *
 * This is where "several items on one Category behave exactly like a single
 * item of their combined amount" is said. The several are a way of thinking in
 * weeks -- sixty thousand of groceries a week rather than two hundred and
 * forty a month -- and not a way of creating four comparisons; #11 measures
 * spending against these entries, so there is one line per Category to be over
 * or under, however many items add up to it.
 *
 * The items stay several: this collapses them for the comparison and never in
 * the plan, so the four weeks remain four editable rows on the screen.
 *
 * The order is the order the Categories were first seen, for the reason
 * `movementsByDay` keeps the order within a day: which of two Categories comes
 * first is a question about how they were fetched, and the screen sorts by
 * what a person reads (`inReadingOrder`).
 */
export function expectedByCategory(
  items: readonly BudgetItem[],
  currency: CurrencyCode,
): readonly CategoryExpectation[] {
  const byCategory = new Map<string, Money>();

  for (const item of items) {
    inTheSameCurrency(item, currency);
    const running = byCategory.get(item.categoryId) ?? zero(currency);
    byCategory.set(
      item.categoryId,
      money(running.amount + item.amount.amount, currency),
    );
  }

  return [...byCategory.entries()].map(([categoryId, expected]) => ({
    categoryId,
    expected,
  }));
}

/** One Category of a month's plan, and what the whole of it expects. */
export type CategoryExpectation = {
  categoryId: string;
  expected: Money;
};

/**
 * One Category of a month's plan, what it expected, and what it really cost.
 *
 * `over` is the figure and not a flag, because the screen has to write it out:
 * "Te pasaste $100.000" is what tells a person who cannot see the red that
 * they are over, and a boolean would leave that sentence with nothing in it.
 * It is null rather than zero when nothing has been overspent, so "not over"
 * and "over by nothing" cannot be confused for one another.
 */
export type CategoryComparison = {
  categoryId: string;
  expected: Money;
  spent: Money;
  /** How far past its expected amount, or null while it is not past it. */
  over: Money | null;
  /**
   * How much of what it expected has been spent, as a share of it: 0.52 is
   * just over half. Past 1 on a Category that went over.
   *
   * Here and not in the reader that draws the meter, because it is the one
   * arithmetic on these two amounts that is not formatting — and a screen
   * doing sums on `Money.amount` is a screen that can disagree with the
   * figures beside it.
   */
  share: number;
};

/**
 * What each Category of a month's plan expected, and what it really cost.
 *
 * The rows are the plan's, not the spending's: a Category nobody planned for
 * has nothing to be over or under, and a comparison against no expectation is
 * a figure with one half missing rather than a line worth drawing.
 *
 * One comparison per Category, driven by the Category's monthly total. That is
 * the same rule `expectedByCategory` states for the plan, asked of the
 * spending too: four weekly items of sixty thousand are not four things to be
 * over, and neither are the eleven Movements measured against them. A Member
 * who is under on every single shop and over for the month is over, and this
 * is the only place that can see it.
 */
export function comparedToPlan(
  items: readonly BudgetItem[],
  movements: readonly Movement[],
  categories: readonly Category[],
  currency: CurrencyCode,
): readonly CategoryComparison[] {
  // Which Categories have anything here to be measured. A Category planned
  // only with Fixed items has one question -- did it get paid -- and the
  // Fijos row answers it with a badge; a meter beside that would read
  // "$180.000 / 180.000" the moment it was paid, drawing what the badge said.
  //
  // The expectation below is still the *whole* plan for the Category, Fixed
  // items included, and that is the half of this rule that would be a lie the
  // other way round: the Movement a Fixed item creates is spending in its
  // Category like any other, so a denominator that left it out would report a
  // Member over on a plan they kept to the peso.
  const measured = new Set(
    items
      .filter((item) => item.kind === "variable")
      .map((item) => item.categoryId),
  );

  // The headings each Category sits under, read once rather than searched per
  // Movement per row: the same walk done inside a filter is the catalogue
  // walked again for every line the screen ends up drawing.
  const headings = new Map(
    categories.map((category) => [category.id, category.parentId]),
  );

  return expectedByCategory(items, currency)
    .filter(({ categoryId }) => measured.has(categoryId))
    .map(({ categoryId, expected }) => {
      // Asked through `spent` rather than summed here: "income is not spending"
      // and "two currencies are never added up" are that function's rules, and
      // a second copy of them is a second place for them to stop being true.
      const cost = spent(
        movements.filter((movement) =>
          countsAgainst(movement, categoryId, headings),
        ),
        currency,
      );

      return {
        categoryId,
        expected,
        spent: cost,
        over:
          cost.amount > expected.amount
            ? money(cost.amount - expected.amount, currency)
            : null,
        // Never a division by nothing: the domain refuses an item that expects
        // an amount of nothing, so a Category with a comparison has something
        // to be measured against.
        share: cost.amount / expected.amount,
      };
    });
}

/**
 * Whether a Movement is spending this row of the plan measures.
 *
 * A plan on a heading covers everything filed under it, which is the rule
 * `CategoryBranch` states and the only reading that makes a plan on "Comida"
 * mean anything: nobody shops under a heading, they shop under "Súper", and a
 * heading that counted only its own Movements would read zero all month.
 *
 * One step up and no further, because the catalogue is two levels and no more.
 * Income never gets here: it carries no Category at all (ADR-0016).
 */
function countsAgainst(
  movement: Movement,
  categoryId: string,
  headings: ReadonlyMap<string, string | null>,
): boolean {
  if (movement.categoryId === null) return false;

  return (
    movement.categoryId === categoryId ||
    headings.get(movement.categoryId) === categoryId
  );
}

/**
 * Which side of the pace a month is on, and by how much.
 *
 * "On it" is its own answer rather than an amount of zero, for the reason
 * `over` is null rather than zero: the sentence a person reads is "vas
 * $620.000 arriba del ritmo", and a figure of nothing written into it would
 * read as news about a month where there is none.
 */
export type PaceStanding =
  | { kind: "ahead"; by: Money }
  | { kind: "behind"; by: Money }
  | { kind: "onPace" };

/**
 * How far through the month a Space is, and how its Variable spending compares
 * with spreading that half of the plan evenly across it.
 *
 * The day travels with the standing and not only the difference, because "you
 * are 620.000 over" answers nothing on its own: over what, by when. It is
 * `MonthSoFar` itself rather than two fields of the same names -- which day of
 * how many is one idea, and it is the calendar's.
 */
export type Pace = MonthSoFar & { standing: PaceStanding };

/**
 * The pace of the month: what an even spread of the Variable half of the plan
 * would have spent by today, against what really went out (#14).
 *
 * Variable items on both sides of the comparison, and ADR-0024 is where that
 * is argued -- including the case it costs, where a Category the plan covers
 * both ways watches a Fixed item's payment move the line.
 *
 * The rollup is the catalogue's (ADR-0021), asked through `countsAgainst` so
 * there is one walk and not a second copy of it. `some` and not a sum per
 * planned Category, because unlike `comparedToPlan` this is a total: a Space
 * that plans a heading and something under it has one shop inside two rows,
 * and counting it twice here would be a figure nobody spent.
 *
 * Nothing at all for a month with no Variable item. A month planned with the
 * rent alone has been planned (ADR-0019) and has no pace -- there is nothing
 * anybody meant to spread across it, and "vas justo en el ritmo" about no plan
 * is a reassurance nobody earned.
 */
export function paceOf(
  items: readonly BudgetItem[],
  movements: readonly Movement[],
  categories: readonly Category[],
  currency: CurrencyCode,
  through: MonthSoFar,
): Pace | null {
  const variables = items.filter((item) => item.kind === "variable");

  if (variables.length === 0) return null;

  const headings = new Map(
    categories.map((category) => [category.id, category.parentId]),
  );

  // The Categories a Variable amount was planned on, read once: the same
  // membership asked per Movement below, and building it inside that filter
  // would rebuild the whole plan for every shop of the month.
  const measured = [...new Set(variables.map((item) => item.categoryId))];

  // Asked through `spent` for the reason `comparedToPlan` asks through it:
  // "income is not spending" and "two currencies are never added up" are that
  // function's rules, and a second copy is a second place to stop being true.
  const cost = spent(
    movements.filter((movement) =>
      measured.some((categoryId) =>
        countsAgainst(movement, categoryId, headings),
      ),
    ),
    currency,
  );

  // Rounded before it is money at all: `money` refuses anything but whole
  // minor units (ADR-0007), and a thirtieth of a hundred pesos is not a
  // number of centavos.
  const byNow = money(
    Math.round((expected(variables, currency).amount * through.day) /
      through.days),
    currency,
  );

  const difference = cost.amount - byNow.amount;

  return {
    ...through,
    standing:
      difference === 0
        ? { kind: "onPace" }
        : difference > 0
          ? { kind: "ahead", by: money(difference, currency) }
          : { kind: "behind", by: money(-difference, currency) },
  };
}

/**
 * What the month's plan adds up to, in the Space's money.
 *
 * The currency is passed in rather than read off the first item, so a month
 * nobody has planned yet is still a figure denominated in the Space's money
 * rather than no answer at all -- the same reason `spent` takes one.
 */
export function expected(
  items: readonly BudgetItem[],
  currency: CurrencyCode,
): Money {
  return items.reduce((running, item) => {
    inTheSameCurrency(item, currency);
    return money(running.amount + item.amount.amount, currency);
  }, zero(currency));
}

/**
 * Two currencies are never added up. A plan in one money measured against
 * spending in another is not a comparison, and converting behind a person's
 * back is the one thing ADR-0007 exists to prevent.
 */
function inTheSameCurrency(item: BudgetItem, currency: CurrencyCode): void {
  if (item.amount.currency !== currency) {
    throw new UnplannableBudgetItemError(
      "amount",
      `${item.id} is in ${item.amount.currency} and this Space is in ${currency}`,
    );
  }
}

function inTheSameSpace(claimed: string, actual: string): void {
  if (claimed !== actual) {
    throw new UnplannableBudgetItemError(
      "space",
      "it is being planned in one Space and claims another",
    );
  }
}

function whichMonth(proposed: string): Month {
  if (!isMonth(proposed)) {
    throw new UnplannableBudgetItemError(
      "month",
      `"${proposed}" is not a month on any calendar`,
    );
  }

  return proposed;
}

/**
 * A Fixed item's name, or a refusal.
 *
 * Trimmed the way a Space's is, and refused when the trimming leaves nothing:
 * the name is the whole of what the row is called, and a blank one is a line
 * in the plan that a person cannot tell from the next one.
 */
function name(proposed: string): string {
  const trimmed = proposed.trim();

  if (trimmed.length === 0) {
    throw new UnplannableBudgetItemError("name", "it is not called anything");
  }
  if (trimmed.length > MAX_FIXED_ITEM_NAME_LENGTH) {
    throw new UnplannableBudgetItemError(
      "name",
      `its name is longer than ${MAX_FIXED_ITEM_NAME_LENGTH} characters`,
    );
  }

  return trimmed;
}

/**
 * The day of the month an item falls due, as a day.
 *
 * `dayOf` is what refuses a 30th of February, and it refuses by throwing the
 * calendar's own error. Translated here into this module's, so a screen has
 * one kind of refusal to switch over and can point at the field that was
 * answered wrongly.
 */
function dueOn(month: Month, proposed: number): CalendarDate {
  try {
    return dayOf(month, proposed);
  } catch (error) {
    if (error instanceof UnreadableDateError) {
      throw new UnplannableBudgetItemError(
        "dueDay",
        `${month} has no day ${proposed}`,
      );
    }
    throw error;
  }
}

function category(proposed: string, planning: Planning): string {
  // Asked through `categoriesVisibleTo` rather than beside it, exactly as a
  // Movement's Category is: "a Category added in one Space is invisible from
  // another" is one rule, and a second answer to it would eventually disagree.
  const visible = categoriesVisibleTo(planning.space.id, planning.categories);

  if (!visible.some((category) => category.id === proposed)) {
    throw new UnplannableBudgetItemError(
      "category",
      "it plans for a Category this Space does not have",
    );
  }

  return proposed;
}

function amount(proposed: number, currency: CurrencyCode): Money {
  if (!Number.isInteger(proposed)) {
    throw new UnplannableBudgetItemError(
      "amount",
      `${proposed} is not a whole number of minor units`,
    );
  }
  if (proposed <= 0) {
    // Expecting nothing of a Category is not a plan for it; it is the absence
    // of one, which is what having no item already says.
    throw new UnplannableBudgetItemError(
      "amount",
      "it expects an amount of nothing",
    );
  }
  if (proposed > MAX_BUDGET_ITEM_AMOUNT) {
    throw new UnplannableBudgetItemError(
      "amount",
      `it is larger than ${MAX_BUDGET_ITEM_AMOUNT} minor units`,
    );
  }

  return money(proposed, currency);
}
