-- The contraction half of the expand/contract in 0012 (#79).
--
-- The trigger and its two functions existed for one deploy and have served it:
-- ADR-0008 runs migrations from an Action while Vercel deploys in parallel, so
-- for a few minutes after 0012 applied, the code of #10 -- which has never
-- heard of naming a Variable item -- was still inserting here without one.
-- `DEFAULT 'variable'` bridged that same window for `kind` in 0009, but a
-- default could not do it here: the honest name is read off a sibling column
-- of the same row, and a default is a constant. So the bridge was a trigger.
--
-- From the deploy after #79 nothing writing here is unaware of the column, and
-- the bridge turns from a rescue into a disguise: every nameless insert is
-- named before `budget_items_carries_what_its_kind_carries` ever sees it, so
-- the name half of that check is unreachable from INSERT while it stands.
--
-- `SET NOT NULL` is the third deploy ADR-0008 asks for after a second one has
-- filled the column, and 0012 was the second. It filled both kinds and not
-- only the Variable ones, and the check has refused a new null since, so there
-- is nothing here for this to find. What 0007 was to 0005 and 0011 was to
-- 0009. The frozen names stay; the machinery that produced them goes.
--
-- Drizzle does not manage triggers or functions, so the three DROPs are
-- hand-written and only the last statement is what `pnpm db:generate` wrote.
DROP TRIGGER "budget_item_is_called_something" ON "budget_items";--> statement-breakpoint
DROP FUNCTION "budget_item_is_called_something"();--> statement-breakpoint
DROP FUNCTION "budget_item_name_for_category"(uuid);--> statement-breakpoint
ALTER TABLE "budget_items" ALTER COLUMN "name" SET NOT NULL;
