-- The other half of a Budget: Fixed items, and marking one paid (#13).
--
-- Four columns on `budget_items` rather than a second table. The two kinds are
-- one plan: they add up into one total, they are read as one month's list, and
-- a union of two tables would turn every one of those into two queries kept in
-- agreement by hand. What only a Fixed item carries is nullable, and a check
-- holds each kind to exactly what its kind carries.
--
-- `kind` arrives with a DEFAULT, which is the expand half of an expand/contract
-- (ADR-0008). Migrations run from an Action while Vercel deploys in parallel,
-- so for a few minutes the code of #10 -- which has never heard of this column
-- -- is still inserting here. Every row already in the table is a Variable
-- item, so 'variable' backfills the truth and keeps those writes working. It
-- was a bridge: 0011 dropped it (#47) as the contraction half, exactly as
-- 0007 was to 0005.
--
-- `movement_id` is where "marking an already-paid item paid does not create a
-- second Movement" is actually enforced. Paid is not a flag beside the
-- Movement, it *is* the Movement, and the UNIQUE means two taps racing each
-- other can only ever leave one of them here. It is not cascaded, for the
-- reason `category_id` is not: a struck Movement is still an entry (ADR-0015),
-- and an item whose payment vanished from under it would read as pending with
-- the money still spent.
--
-- Nothing is dropped and no row is rewritten: four nullable-or-defaulted
-- columns and four constraints that every existing row already satisfies.
ALTER TABLE "budget_items" ADD COLUMN "kind" text DEFAULT 'variable' NOT NULL;--> statement-breakpoint
ALTER TABLE "budget_items" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "budget_items" ADD COLUMN "due_on" date;--> statement-breakpoint
ALTER TABLE "budget_items" ADD COLUMN "movement_id" uuid;--> statement-breakpoint
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_movement_id_movements_id_fk" FOREIGN KEY ("movement_id") REFERENCES "public"."movements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_movement_pays_one_item" UNIQUE("movement_id");--> statement-breakpoint
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_kind_is_one_of_two" CHECK ("budget_items"."kind" in ('variable', 'fixed'));--> statement-breakpoint
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_carries_what_its_kind_carries" CHECK ((
        "budget_items"."kind" = 'variable'
        and "budget_items"."name" is null
        and "budget_items"."due_on" is null
        and "budget_items"."movement_id" is null
      ) or (
        "budget_items"."kind" = 'fixed'
        and char_length(btrim("budget_items"."name")) > 0
        and "budget_items"."due_on" is not null
      ));--> statement-breakpoint
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_due_on_is_in_its_month" CHECK ("budget_items"."due_on" is null or to_char("budget_items"."due_on", 'YYYY-MM') = "budget_items"."month");