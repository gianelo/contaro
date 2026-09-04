-- Income, and the Category an expense has that income does not (#8).
--
-- `DEFAULT 'expense'` is the expand step of ADR-0008 and not a permanent
-- default. It exists because the Action applying this and the deploy shipping
-- #8 run in parallel: for a few minutes the code of #7 is inserting Movements
-- against this schema, and that code has never heard of a direction. Every row
-- already in the table is an expense too, so the default backfills them with
-- the truth rather than a guess.
--
-- The contraction landed a deploy later, in 0007 (#26), once nothing writing
-- here was unaware of the column. Until then a default was the price of a
-- rollback that lands on a schema it can still write to.
ALTER TABLE "movements" ADD COLUMN "direction" text DEFAULT 'expense' NOT NULL;--> statement-breakpoint
ALTER TABLE "movements" ALTER COLUMN "category_id" DROP NOT NULL;--> statement-breakpoint
-- The two kinds and no third, the same set `isMovementDirection` refuses in
-- the domain.
ALTER TABLE "movements" ADD CONSTRAINT "movements_direction_is_one_of_two" CHECK ("movements"."direction" IN ('expense', 'income'));--> statement-breakpoint
-- The Category dimension exists to be measured against a Budget, and a Budget
-- is a plan of expenses (CONTEXT.md). So an expense is filed and income is
-- not. This is the floor under `filing` in the domain: without it, the one row
-- that makes every Budget figure wrong -- a salary under "Alquiler" -- is one
-- INSERT away for anything that does not go through the domain.
ALTER TABLE "movements" ADD CONSTRAINT "movements_expense_is_filed_and_income_is_not" CHECK (("movements"."direction" = 'expense' AND "movements"."category_id" IS NOT NULL)
        OR ("movements"."direction" = 'income' AND "movements"."category_id" IS NULL));--> statement-breakpoint
-- A Movement's Category is now optional, so the rule that keeps one Space's
-- money out of another's ledger has to say what it means when there is none:
-- nothing to check, because income is filed nowhere. Replaced whole rather
-- than added beside, so there is one answer to "does this Movement belong to
-- this Space" and not two that can drift.
CREATE OR REPLACE FUNCTION movement_belongs_to_its_space() RETURNS trigger AS $$
DECLARE
	category_space uuid;
	category_found boolean;
BEGIN
	IF NEW.category_id IS NOT NULL THEN
		SELECT space_id, true INTO category_space, category_found
			FROM categories WHERE id = NEW.category_id;

		-- The foreign key has already refused a Category that does not exist;
		-- this is what happens if it is ever dropped.
		IF category_found IS NULL THEN
			RAISE EXCEPTION 'Movement % is filed under %, which does not exist.', NEW.id, NEW.category_id;
		END IF;

		IF category_space IS NOT NULL AND category_space IS DISTINCT FROM NEW.space_id THEN
			RAISE EXCEPTION 'A Movement cannot be filed under a Category belonging to another Space (#6): % is in %, not %.', NEW.category_id, category_space, NEW.space_id;
		END IF;
	END IF;

	IF NOT EXISTS (
		SELECT 1 FROM space_members
		WHERE space_id = NEW.space_id AND member_id = NEW.recorded_by
	) THEN
		RAISE EXCEPTION 'Movement % is recorded by %, who is not a Member of %.', NEW.id, NEW.recorded_by, NEW.space_id;
	END IF;

	IF NOT EXISTS (
		SELECT 1 FROM space_members
		WHERE space_id = NEW.space_id AND member_id = NEW.attributed_to
	) THEN
		RAISE EXCEPTION 'Movement % is attributed to %, who is not a Member of %.', NEW.id, NEW.attributed_to, NEW.space_id;
	END IF;

	-- Striking one out is the one act a non-Member could never be behind, so
	-- it is held to the same rule rather than left to the screen that offers it.
	IF NEW.struck_by IS NOT NULL AND NOT EXISTS (
		SELECT 1 FROM space_members
		WHERE space_id = NEW.space_id AND member_id = NEW.struck_by
	) THEN
		RAISE EXCEPTION 'Movement % was struck out by %, who is not a Member of %.', NEW.id, NEW.struck_by, NEW.space_id;
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
-- Which way the money went is what kind of Movement this is rather than a
-- field on one, so it is as unchangeable as who recorded it. The domain
-- refuses the change in `amendMovement`; this refuses it for every path that
-- never goes through the domain, the way the recorder's trigger above does.
--
-- Its own function and not a line inside `movement_recorder_is_immutable`,
-- because a function whose name says "recorder" and whose body refuses two
-- other things is a name that stops being read.
CREATE FUNCTION movement_direction_is_immutable() RETURNS trigger AS $$
BEGIN
	IF NEW.direction IS DISTINCT FROM OLD.direction THEN
		RAISE EXCEPTION 'A Movement direction can never be changed (#8): % is %, not %. Strike it out and record the other instead.', OLD.id, OLD.direction, NEW.direction;
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER movement_direction_is_immutable
	BEFORE UPDATE ON "movements"
	FOR EACH ROW EXECUTE FUNCTION movement_direction_is_immutable();
