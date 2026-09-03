import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  date,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

/**
 * The Drizzle schema. Tables arrive with the tickets that need them:
 * Movements with #7, Budgets with #10.
 *
 * Every table's shape is generated into `migrations/` by `pnpm db:generate`;
 * the rules a column type cannot express are written into that SQL by hand as
 * triggers, so they hold for every path into the table and not only the one
 * that goes through the domain.
 */

/**
 * A person with access to the product. Identity only: which Spaces a Member
 * belongs to is `spaceMembers` below.
 *
 * `googleSubject` is Google's `sub` claim, stable for the life of the account
 * and never reused. It is what a Member is looked up by; the email address is
 * carried for display and for the invitations in #5, and can change.
 */
export const members = pgTable("members", {
  id: uuid("id").primaryKey().defaultRandom(),
  googleSubject: text("google_subject").notNull().unique(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * A Space: Members, one currency, and everything recorded in it (#4).
 *
 * `currency` is a plain code because the set of codes is the domain's, not the
 * database's (see `src/domain/money/currency.ts`). What the database does own
 * is that the column never changes after the insert: migration 0002 puts a
 * trigger on it, so ADR-0001 holds against every path into this table, not only
 * the one that goes through `amendSpace`.
 */
export const spaces = pgTable("spaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  currency: text("currency").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Who is in a Space. A Member belongs to many Spaces and a Space holds one or
 * two Members, so membership is its own table rather than a column on either.
 *
 * The pair is the primary key: the same Member cannot be in the same Space
 * twice, and the invitation in #9 can lean on that instead of checking first.
 */
export const spaceMembers = pgTable(
  "space_members",
  {
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.spaceId, table.memberId] })],
);

/**
 * A Category, global or a Space's own (#6).
 *
 * One table and not two, because the two kinds are one catalogue as far as
 * every reader is concerned: `space_id IS NULL` is a Category shipped with the
 * product and seen by every Space, and a Space's id is one its Members typed
 * and nobody outside that Space ever sees. Keeping them together is what gives
 * #7's Movement and #10's Budget item one foreign key to point at instead of
 * two nullable ones and a rule about which is set.
 *
 * `slug` and `name` are exclusive, and the check below is what makes them so: a
 * shipped Category is named by a translation (`category.<slug>` in the message
 * catalogue) so a second language is a file rather than a migration, and one a
 * Member typed is shown in the words they typed.
 */
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** The Space it belongs to; null is the global catalogue. */
    spaceId: uuid("space_id").references(() => spaces.id, {
      onDelete: "cascade",
    }),
    /**
     * The Category this one sits under. Set to null and never cascaded: what
     * hangs off a shipped heading includes Categories a Member typed, and
     * retiring a heading in a migration must not delete their naming -- nor,
     * once #7 lands, the Movements recorded under it. A subcategory whose
     * heading is gone becomes a heading itself, which is what `catalogueFor`
     * shows and what a Budget in #10 can still be set on.
     */
    parentId: uuid("parent_id").references((): AnyPgColumn => categories.id, {
      onDelete: "set null",
    }),
    /** The message key a shipped Category is named by. Null for a Space's own. */
    slug: text("slug").unique(),
    /** What a Member typed. Null for a shipped Category. */
    name: text("name"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "categories_shipped_or_typed",
      sql`(${table.spaceId} IS NULL AND ${table.slug} IS NOT NULL AND ${table.name} IS NULL)
        OR (${table.spaceId} IS NOT NULL AND ${table.slug} IS NULL AND ${table.name} IS NOT NULL)`,
    ),
    // Every read is "the catalogue this Space can see", which is the global
    // rows plus one Space's. Null space_ids are indexed too, so the global half
    // of that answer is a lookup rather than a scan of everyone's Categories.
    index("categories_space_id_idx").on(table.spaceId),
  ],
);

/**
 * A Movement: money that has already left or entered a Space (#7).
 *
 * There is no pending state and no column for one — a Movement means the money
 * moved. What is due next week is a Fixed item on a Budget (#13), and marking
 * it paid is what inserts a row here.
 *
 * The two Members are two different questions and so two columns. `recorded_by`
 * answers "who typed this in" and is never updated; `attributed_to` answers
 * "whose money was it" and is what every per-Member report reads.
 *
 * Neither foreign key cascades from `members`. A Member row disappearing must
 * not take a shared Space's history with it — the other Member is still owed an
 * honest ledger — so the reference simply refuses the delete. Both refer to the
 * table with no action rather than `restrict`, which is checked at the end of
 * the statement instead of immediately: deleting a Space cascades the Movements
 * and the Categories together, and `restrict` would refuse its own cascade.
 */
export const movements = pgTable(
  "movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    /**
     * Which way the money went: `expense` or `income` (#8). Plain text with a
     * check rather than a Postgres enum, for the reason `spaces.currency` is
     * text: the set of directions is the domain's (`isMovementDirection`), and
     * an enum type would make adding to it a migration on a type rather than a
     * line in the module that owns the rule.
     *
     * No default here, and for a reason: a row that arrives without a direction
     * is a write that went round the domain, and defaulting it to `expense`
     * would quietly file somebody's salary as a purchase — the very rounding
     * `recordMovement` refuses by name.
     *
     * The running column disagrees with that today. Migration 0005 added it
     * `DEFAULT 'expense'` as the expand step of ADR-0008, because the code of
     * #7 was still inserting while the Action ran. That default is temporary
     * and #26 drops it; until then this declaration is where the schema is
     * going and `information_schema` is where it is.
     */
    direction: text("direction").notNull(),
    /**
     * The Category an expense is filed under. Not cascaded and not nulled by
     * the catalogue: money recorded against a Category outlives any tidying of
     * it, and a Movement whose Category vanished is a figure nobody can
     * explain.
     *
     * Nullable only because income carries no Category at all (#8), and the
     * check below is what keeps that the *only* reason it is ever null.
     */
    categoryId: uuid("category_id").references(() => categories.id),
    /**
     * Minor units, always in the Space's currency (ADR-0007). `bigint` and not
     * `integer`: 2.1 billion minor units is fifteen thousand dollars' worth of
     * Argentine pesos, which is a month's rent rather than a ceiling.
     */
    amount: bigint("amount", { mode: "number" }).notNull(),
    /** The day the money moved. A day, not an instant: see `CalendarDate`. */
    occurredOn: date("occurred_on", { mode: "string" }).notNull(),
    recordedBy: uuid("recorded_by")
      .notNull()
      .references(() => members.id),
    attributedTo: uuid("attributed_to")
      .notNull()
      .references(() => members.id),
    /**
     * Who struck this Movement out, and when. A correction that removes an
     * entry is itself an entry: a ledger that loses rows silently lies about
     * every figure downstream, so a deletion writes down whose it was rather
     * than leaving a gap. Set together and never unset.
     */
    struckBy: uuid("struck_by").references(() => members.id),
    struckAt: timestamp("struck_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // An expense of nothing is an expense nobody made, and which way the money
    // went is what kind of Movement this is rather than the sign of its amount.
    check("movements_amount_is_money_that_moved", sql`${table.amount} > 0`),
    // The two kinds, and no third. `isMovementDirection` refuses the same set
    // in the domain; this is what refuses it for every path that never goes
    // through the domain, the way ADR-0001's trigger does for a currency.
    check(
      "movements_direction_is_one_of_two",
      sql`${table.direction} IN ('expense', 'income')`,
    ),
    // The Category dimension exists to be measured against a Budget, and a
    // Budget is a plan of expenses (CONTEXT.md). So an expense is filed and
    // income is not -- and this is the floor under `filing` in the domain, so
    // that "Alquiler" can never become a salary by a route nobody wrote.
    check(
      "movements_expense_is_filed_and_income_is_not",
      sql`(${table.direction} = 'expense' AND ${table.categoryId} IS NOT NULL)
        OR (${table.direction} = 'income' AND ${table.categoryId} IS NULL)`,
    ),
    check(
      "movements_struck_or_standing",
      sql`(${table.struckBy} IS NULL AND ${table.struckAt} IS NULL)
        OR (${table.struckBy} IS NOT NULL AND ${table.struckAt} IS NOT NULL)`,
    ),
    // Every read is "this Space's Movements, in this month", which is exactly
    // this pair. Struck rows are left in the index: they are a small minority
    // and a partial index would have to be dropped the day #8 shows them.
    index("movements_space_id_occurred_on_idx").on(
      table.spaceId,
      table.occurredOn,
    ),
  ],
);
