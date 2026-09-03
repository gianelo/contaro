import { pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * The Drizzle schema. Tables arrive with the tickets that need them:
 * Categories with #6, Movements with #7, Budgets with #10.
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
