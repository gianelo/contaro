import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * The Drizzle schema. Tables arrive with the tickets that need them:
 * Spaces with #4, Categories with #6, Movements with #7, Budgets with #10.
 */

/**
 * A person with access to the product. Identity only: which Spaces a Member
 * belongs to is a separate table that arrives with #4.
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
