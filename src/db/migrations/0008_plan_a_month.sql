-- Planning a month, as Variable items on a Budget (#10).
--
-- A Budget is the plan of expenses a Space expects to make in a month, and it
-- is these rows and nothing above them: a Budget comes into existence with its
-- first item, so there is no moment anybody creates an empty one. What the
-- close of a month freezes (ADR-0002) is the month itself -- its Movements as
-- much as its plan -- so that will not hang here either.
--
-- Nothing here marks an item paid and nothing says which kind it is. A
-- Variable item is never marked paid, and Fixed items arrive with #13 the way
-- `direction` arrived with #8: a column added before the ticket that needs it
-- is a rule nobody has written yet.
--
-- Nothing is dropped and nothing is rewritten, so a deploy that has not caught
-- up keeps working exactly as it did (ADR-0008). The table is new, so no
-- running code reads or writes it, and the foreign key onto `categories` sits
-- on inserts nothing performs yet.
--
-- Deliberately no unique index on (space_id, month, category_id): several
-- items on one Category are how a person plans a month in weeks, and they
-- behave as a single item of their combined amount rather than as a duplicate.
CREATE TABLE "budget_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"month" text NOT NULL,
	"category_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budget_items_amount_is_money_expected" CHECK ("budget_items"."amount" > 0),
	CONSTRAINT "budget_items_month_is_a_month" CHECK ("budget_items"."month" ~ '^\d{4}-(0[1-9]|1[0-2])$')
);
--> statement-breakpoint
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "budget_items_space_id_month_idx" ON "budget_items" USING btree ("space_id","month");