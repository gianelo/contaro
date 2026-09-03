import { sql } from "drizzle-orm";
import {
  check,
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
