/**
 * A Movement: a single entry of money leaving or entering a Space (see
 * CONTEXT.md). Which of the two it is is its `direction`, and that is what
 * kind of Movement it is rather than the sign of its amount (ADR-0016).
 *
 * A Movement always means money that has **already moved**. There is no
 * pending or scheduled state on one, which is why the only day it can carry is
 * one that has happened: something due next week is a Fixed item on a Budget
 * (#13), and marking that paid is what brings a Movement into existence.
 *
 * It carries two Members and they are not the same question. `recordedBy` is
 * who typed it in, taken from the session and never editable, so there is
 * always an honest record of who put a figure there. `attributedTo` is whose
 * money it actually was, defaulting to the recorder and changeable at entry,
 * and it is what every per-Member report reads.
 */

import {
  calendarDate,
  isCalendarDate,
  type CalendarDate,
} from "../calendar/month";
import { categoriesVisibleTo, type Category } from "../category/category";
import { money, zero, type Money } from "../money/money";
import type { CurrencyCode } from "../money/currency";
import type { Space } from "../space/space";

/**
 * Which way the money went. An expense and an income are the two kinds of
 * Movement (CONTEXT.md), and this is which kind one is.
 *
 * A kind and never the sign of the amount. Every figure in this product is a
 * positive number of minor units (ADR-0007), and a sign carrying the meaning
 * would put the difference between money spent and money earned into a
 * character that a `Math.abs` somewhere downstream silently erases.
 */
export type MovementDirection = "expense" | "income";

const DIRECTIONS: readonly MovementDirection[] = ["expense", "income"];

/**
 * Whether a string from outside — a form field, a database row — names one of
 * the two directions.
 *
 * It exists for the reason `isMonth` exists: the answer arrives from a form,
 * which carries any string at all, and a Movement whose direction is "gasto"
 * or "" would be a row the totals cannot classify. Refused rather than
 * defaulted to an expense: a default here quietly turns somebody's salary into
 * a purchase.
 */
export function isMovementDirection(value: string): value is MovementDirection {
  // `some` and not `includes`, so nothing has to be cast away: `includes` on a
  // `readonly MovementDirection[]` refuses a plain string, and widening the
  // array to silence it would take the type's word for what is in it.
  return DIRECTIONS.some((direction) => direction === value);
}

/** A Movement that has been recorded and stands. */
export type Movement = {
  id: string;
  spaceId: string;
  direction: MovementDirection;
  /**
   * The Category an expense is filed under. Null on income, and null only
   * there: the Category dimension exists to be measured against a Budget, and
   * a Budget is a plan of expenses (CONTEXT.md), so a Category on income would
   * be a bucket no Budget ever reads.
   */
  categoryId: string | null;
  /** Always in the Space's currency, never in one an answer asked for. */
  amount: Money;
  /** The day the money moved. A day, not an instant: see `CalendarDate`. */
  occurredOn: CalendarDate;
  /** Who typed it in. Set from the session and never changed. */
  recordedBy: string;
  /** Whose money it was. What a per-Member report reads. */
  attributedTo: string;
};

/**
 * A Movement that does not exist yet, so it has no id to give.
 *
 * There is no struck-out kind of `Movement` on purpose. A Movement that has
 * been struck out is not readable at all — `strikeMovement` in the store hides
 * it and `asMovement` refuses to build one — so no reader can forget to leave
 * it out of a total. Who struck it and when is kept on the row, because a
 * ledger that loses entries silently lies about every figure downstream.
 */
export type NewMovement = Omit<Movement, "id">;

/**
 * What a Member answered on the entry screen. Every field is a claim, which is
 * why each one is checked against the Space below.
 *
 * There is deliberately nowhere here to say who recorded it. That is the
 * strongest form "cannot be changed" takes: not a rule that refuses the field,
 * but a field that cannot be written down.
 */
export type MovementDraft = {
  spaceId: string;
  /**
   * Which way the money went, as the screen answered it. A plain string for
   * the reason `occurredOn` is one: it arrives from a form, which carries any
   * string at all, and `recordMovement` is where a claim becomes a fact.
   */
  direction: string;
  /** The Category, for an expense. Null on income, which carries none. */
  categoryId: string | null;
  /** Minor units, the way the keypad counts them. 128400 is $1.284,00. */
  amount: number;
  occurredOn: string;
  /** Whose money it is. Null means the Member doing the recording. */
  attributedTo: string | null;
};

/** What a correction may change. Not `recordedBy`: see `amendMovement`. */
export type MovementAmendment = {
  categoryId?: string | null;
  amount?: number;
  occurredOn?: string;
  attributedTo?: string;
  /** Accepted only to be refused, the way `SpaceAmendment.currency` is. */
  recordedBy?: string;
  /**
   * Accepted only to be refused too: see `DirectionIsImmutableError`. A plain
   * string for the reason the draft's is one — the correction screen carries
   * it back as a hidden field, so it is a claim and not a fact, and a word
   * that is neither direction differs from this Movement's and is refused by
   * the same comparison.
   */
  direction?: string;
};

/**
 * The Space a Movement is being recorded or corrected in, as the rules need to
 * see it: everything they decide over arrives here rather than being looked
 * up, so they run in milliseconds with no database (ADR-0005).
 */
export type Recorder = {
  space: Space;
  /** The signed-in Member. `recordedBy` is this and nothing else. */
  recordedBy: string;
  /**
   * The day it is, by a clock nobody typing can move.
   *
   * The server's and never the browser's: the browser's day is what the entry
   * screen *offers*, and a screen that offered the bound as well would be a
   * bound anyone could lift by setting their phone's clock forward.
   */
  today: CalendarDate;
};

/**
 * Everything above, plus the rows the rules are decided over.
 *
 * Split in two because the halves are known in two different places: a screen
 * knows the `Recorder` the moment it knows who is asking, and the Members and
 * the catalogue are fetched by the store on the way past.
 */
export type Recording = Recorder & {
  /** Everyone in the Space, so attribution can be held to them. */
  memberIds: readonly string[];
  /** The catalogue the Space can see, shipped rows and its own alike. */
  categories: readonly Category[];
};

/**
 * The largest amount contaro will record, in minor units: twelve digits.
 *
 * Not a technical limit — the column holds far more — but the point past which
 * a figure is a slipped thumb rather than an expense. A trillion Colombian
 * pesos is nobody's groceries, and every month's total staying this far inside
 * what a JavaScript number holds exactly is what keeps a sum from drifting.
 */
export const MAX_MOVEMENT_AMOUNT = 999_999_999_999;

/**
 * Which answer on the entry screen was the bad one. Its own type because two
 * places switch exhaustively over it -- the domain throwing and the screen
 * saying what went wrong -- and a sixth field added to one list and not the
 * other is a refusal nobody is ever told about.
 */
export type MovementField =
  | "amount"
  | "category"
  | "day"
  | "attribution"
  | "direction"
  | "space";

/**
 * Thrown when a Movement cannot be recorded or corrected as asked. `field`
 * says which answer was the bad one, so a screen can point at the input rather
 * than showing one apology for a form of five.
 */
export class UnrecordableMovementError extends Error {
  readonly field: MovementField;

  constructor(field: MovementField, reason: string) {
    super(`This Movement cannot be recorded: ${reason}.`);
    this.name = "UnrecordableMovementError";
    this.field = field;
  }
}

/**
 * Thrown by any attempt to move a Movement to another recorder. Who typed a
 * figure in is a fact about what happened, and a fact that can be edited is
 * not a record of anything (story 22 in #1).
 */
export class RecorderIsImmutableError extends Error {
  constructor(from: string, to: string) {
    super(
      `A Movement's recorder can never be changed, and this one was recorded by ${from}, not ${to}. Correct the attribution instead.`,
    );
    this.name = "RecorderIsImmutableError";
  }
}

/**
 * Thrown by any attempt to correct an expense into income or the other way
 * round.
 *
 * Which way the money went is what kind of Movement this is rather than a
 * field on one, and the two kinds do not carry the same answers: an expense is
 * filed under a Category and income carries none. A correction that changed
 * the kind would have to invent a Category or throw one away in the same
 * breath, and neither is a correction — it is a different entry. Striking this
 * one out (ADR-0015) and recording the other is two taps and leaves an honest
 * ledger, which is the trade this refusal is making.
 */
export class DirectionIsImmutableError extends Error {
  constructor(from: MovementDirection, to: string) {
    super(
      `A Movement's direction can never be changed, and this one is ${from}, not ${to}. Strike it out and record the other instead.`,
    );
    this.name = "DirectionIsImmutableError";
  }
}

/**
 * What a Member's answers become, checked against the Space they are being
 * recorded in.
 *
 * Every rule here is about that Space: the money is its currency, the Category
 * is one it can see, the attribution is one of its Members. Handing them in
 * rather than looking them up is what lets all of it be driven directly.
 */
export function recordMovement(
  draft: MovementDraft,
  recording: Recording,
): NewMovement {
  inTheSameSpace(draft.spaceId, recording.space.id);

  const direction = whichWay(draft.direction);

  return {
    spaceId: recording.space.id,
    direction,
    categoryId: filing(direction, draft.categoryId, recording),
    amount: amount(draft.amount, recording.space.currency),
    occurredOn: day(draft.occurredOn, recording.today),
    // From the session, never from the draft, which has nowhere to say it.
    recordedBy: recording.recordedBy,
    attributedTo: attribution(draft.attributedTo, recording),
  };
}

/**
 * A Movement as a correction leaves it, held to every rule the recording was
 * held to.
 *
 * Any Member of the Space may correct any of its Movements: inside a shared
 * Space the money is one pot, and `recordedBy` is a record of who typed a
 * figure in rather than a claim to own it. Whoever corrects it, that record
 * stands — which is what makes the correction honest rather than a way to
 * quietly become the author of somebody else's mistake.
 */
export function amendMovement(
  movement: Movement,
  changes: MovementAmendment,
  recording: Recording,
): Movement {
  // Checked before anything is applied, the way `amendSpace` checks, so a
  // refused correction changes nothing rather than landing its good half.
  if (
    changes.recordedBy !== undefined &&
    changes.recordedBy !== movement.recordedBy
  ) {
    throw new RecorderIsImmutableError(movement.recordedBy, changes.recordedBy);
  }

  // Refused only when it differs, the way the recorder is: the correction
  // screen carries every answer a Movement has, so a value identical to the
  // one on the row is the ordinary correction rather than an attempt at one.
  if (
    changes.direction !== undefined &&
    changes.direction !== movement.direction
  ) {
    throw new DirectionIsImmutableError(movement.direction, changes.direction);
  }

  inTheSameSpace(movement.spaceId, recording.space.id);

  return {
    ...movement,
    // Through `filing` and not `category`, so a correction is held to "an
    // expense carries a Category and income carries none" exactly as the
    // recording was. The direction is the Movement's own, never the change's:
    // it cannot have differed and got this far.
    categoryId:
      changes.categoryId === undefined
        ? movement.categoryId
        : filing(movement.direction, changes.categoryId, recording),
    amount:
      changes.amount === undefined
        ? movement.amount
        : amount(changes.amount, recording.space.currency),
    occurredOn:
      changes.occurredOn === undefined
        ? movement.occurredOn
        : day(changes.occurredOn, recording.today),
    attributedTo:
      changes.attributedTo === undefined
        ? movement.attributedTo
        : attribution(changes.attributedTo, recording),
  };
}

/**
 * What a set of Movements adds up to — the figure the month's screen shows.
 *
 * The currency is passed in rather than read off the first Movement, so an
 * empty month is still a figure denominated in the Space's money instead of no
 * answer at all.
 */
export function spent(
  movements: readonly Movement[],
  currency: CurrencyCode,
): Money {
  return total(movements, "expense", currency);
}

/**
 * What a set of Movements brought in — the month's other figure.
 *
 * Beside `spent` and never subtracted from it. The month's two totals answer
 * two different questions ("what came in" and "what went out"), and a single
 * net figure would show a month where a salary arrived and the rent was paid
 * as though almost nothing had happened in it.
 */
export function earned(
  movements: readonly Movement[],
  currency: CurrencyCode,
): Money {
  return total(movements, "income", currency);
}

/**
 * One month's Movements arranged the way its screen reads them: the days that
 * had something in them, most recent first, each carrying what happened on it.
 *
 * A day is what a person remembers about money ("el jueves fui al súper"), so
 * it is the heading a list is broken by. Days with nothing in them are absent
 * rather than empty: an empty row is a row a thumb scrolls past, and a month
 * of thirty of them buries the four that matter.
 *
 * The order within a day is the order it was handed, for the reason
 * `categoriesVisibleTo` keeps the order it is given: which of two Movements on
 * one day comes first is a question about how they were fetched.
 */
export function movementsByDay(
  movements: readonly Movement[],
): readonly MovementsOnADay[] {
  const days = new Map<CalendarDate, Movement[]>();

  for (const movement of movements) {
    days.set(movement.occurredOn, [
      ...(days.get(movement.occurredOn) ?? []),
      movement,
    ]);
  }

  return [...days.entries()]
    // Written `YYYY-MM-DD`, so comparing the strings is comparing the days the
    // way a calendar orders them -- which is the whole reason `CalendarDate`
    // is that shape and never a `Date` (see `month.ts`).
    .sort(([earlier], [later]) => (earlier < later ? 1 : -1))
    .map(([day, movements]) => ({ day, movements }));
}

/** One day of a month and everything recorded on it. */
export type MovementsOnADay = {
  day: CalendarDate;
  movements: readonly Movement[];
};

/**
 * The sum of the Movements going one way, in the Space's money.
 *
 * `spent` and `earned` are one rule asked twice, so they are one function: a
 * second copy of "refuse to add up two currencies" is a second place for that
 * refusal to quietly stop happening.
 */
function total(
  movements: readonly Movement[],
  direction: MovementDirection,
  currency: CurrencyCode,
): Money {
  return movements.reduce((running, movement) => {
    if (movement.amount.currency !== currency) {
      throw new UnrecordableMovementError(
        "amount",
        `${movement.id} is in ${movement.amount.currency} and this Space is in ${currency}`,
      );
    }
    return movement.direction === direction
      ? money(running.amount + movement.amount.amount, currency)
      : running;
  }, zero(currency));
}

function inTheSameSpace(named: string, actual: string): void {
  if (named !== actual) {
    // A Movement recorded against a Space nobody proved membership of would be
    // money appearing in somebody else's ledger. Nothing on the screen is the
    // problem here, so no field is pointed at.
    throw new UnrecordableMovementError(
      "space",
      "it names a different Space than the one it is being recorded in",
    );
  }
}

function amount(proposed: number, currency: CurrencyCode): Money {
  if (!Number.isInteger(proposed)) {
    throw new UnrecordableMovementError(
      "amount",
      `${proposed} is not a whole number of ${currency} minor units`,
    );
  }
  if (proposed <= 0) {
    // Which direction the money went is what kind of Movement this is, not the
    // sign of its amount — so an expense of nothing is an expense nobody made.
    throw new UnrecordableMovementError("amount", "it is an amount of nothing");
  }
  if (proposed > MAX_MOVEMENT_AMOUNT) {
    throw new UnrecordableMovementError(
      "amount",
      `it is larger than ${MAX_MOVEMENT_AMOUNT} minor units`,
    );
  }

  return money(proposed, currency);
}

/** A claimed direction, or a refusal. See `isMovementDirection`. */
function whichWay(proposed: string): MovementDirection {
  if (!isMovementDirection(proposed)) {
    throw new UnrecordableMovementError(
      "direction",
      `"${proposed}" is neither an expense nor income`,
    );
  }

  return proposed;
}

/**
 * What a Movement is filed under, which is a question only an expense has.
 *
 * The two halves are one rule and so one function: an expense carries a
 * Category this Space can see, and income carries none at all. Split in two
 * they would be two rules that can disagree, and the row that satisfies
 * neither — income filed under "Alquiler" — is the one the whole Budget side
 * of this product would then have to keep excluding by hand.
 */
function filing(
  direction: MovementDirection,
  proposed: string | null,
  recording: Recording,
): string | null {
  if (direction === "income") {
    if (proposed !== null && proposed.trim() !== "") {
      throw new UnrecordableMovementError(
        "category",
        "income carries no Category, and this one names a Category to file it under",
      );
    }
    return null;
  }

  if (proposed === null || proposed.trim() === "") {
    // An expense nobody classified is an expense no Budget can measure, which
    // is the one thing every Category in this product exists to make possible.
    throw new UnrecordableMovementError(
      "category",
      "an expense is filed under a Category and this one names none",
    );
  }

  return category(proposed, recording);
}

function category(proposed: string, recording: Recording): string {
  // Asked through `categoriesVisibleTo` rather than beside it: "a Category
  // added in one Space is invisible from another" is one rule, and a second
  // answer to it would eventually disagree with the first.
  const visible = categoriesVisibleTo(recording.space.id, recording.categories);

  if (!visible.some((category) => category.id === proposed)) {
    // Not found covers "no such Category" and "one this Space cannot see"
    // alike: the second is the first as far as this Space is concerned, and
    // saying otherwise confirms that another Space's Category exists.
    throw new UnrecordableMovementError(
      "category",
      "it is filed under a Category this Space does not have",
    );
  }

  return proposed;
}

function day(proposed: string, today: CalendarDate): CalendarDate {
  if (!isCalendarDate(proposed)) {
    throw new UnrecordableMovementError(
      "day",
      `"${proposed}" is not a day on any calendar`,
    );
  }

  if (proposed > tomorrow(today)) {
    throw new UnrecordableMovementError(
      "day",
      "it has not happened yet, and a Movement is money that already moved",
    );
  }

  return proposed;
}

/**
 * A day of slack past the clock, because somebody is always ahead of it.
 *
 * Kiritimati is UTC+14: half past midnight there is still yesterday wherever
 * this server runs, and holding a Member to the server's day would leave them
 * unable to record anything for the first fourteen hours of every one of
 * theirs. Two days ahead is no timezone on earth, so that is where it stops.
 *
 * Written `YYYY-MM-DD`, so `>` compares days the way a calendar orders them.
 */
function tomorrow(today: CalendarDate): CalendarDate {
  const at = Date.parse(`${today}T00:00:00Z`);
  return calendarDate(
    new Date(at + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );
}

function attribution(proposed: string | null, recording: Recording): string {
  // Nobody named is the ordinary case and the whole point of story 20: the
  // Member recording it is nearly always the Member whose money it was, so
  // the ordinary case asks them nothing.
  const attributedTo = proposed === null || proposed.trim() === ""
    ? recording.recordedBy
    : proposed;

  if (!recording.memberIds.includes(attributedTo)) {
    throw new UnrecordableMovementError(
      "attribution",
      "it is attributed to somebody who is not in this Space",
    );
  }

  return attributedTo;
}
