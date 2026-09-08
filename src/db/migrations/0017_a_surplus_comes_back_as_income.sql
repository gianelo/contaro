-- A surplus comes back as income, and a deficit never does (#120).
--
-- ADR-0003 decided in the product's first week where a month's leftover goes:
-- "an income Movement in the following month, attributed to no Member, with its
-- origin set to the carry-over of the month it came from". ADR-0016 then named
-- the two columns it would take and left them for this ticket -- "a nullable
-- `attributed_to` and an `origin`, and that is #15's problem rather than this
-- one's". These are those columns, and #120 is what finally asks for them: the
-- close (#117) is what makes a month's figure firm, and until there was a close
-- there was nothing to carry.
--
-- What #120 adds to ADR-0003 is the direction. A surplus is money that still
-- exists and can be spent again, so it comes back. A deficit is money already
-- spent, almost always on a card, and that card is paid the following month --
-- where the payment is a genuine expense of it. Writing the deficit in as well
-- would charge one overspend twice and render a month that was fine as a month
-- that failed. So the carry-over is one-directional, and the only shape of it
-- this schema can hold is the one that moves.
--
-- ADR-0008 holds in one deploy. `DROP NOT NULL` widens what the column accepts,
-- so a deploy that has not caught up goes on writing a Member into it and is
-- refused by nothing; the new column is nullable with no default, so the same
-- deploy's inserts leave it null and land as ordinary Movements. There is
-- nothing to backfill: every row that exists came from a Member, which is
-- exactly what a null `carried_from` says about it.

-- Nullable, and null in exactly one place. What keeps that from being a hole is
-- `movements_comes_from_a_member_or_from_a_month` below.
ALTER TABLE "movements" ALTER COLUMN "attributed_to" DROP NOT NULL;--> statement-breakpoint

-- **Origin** (CONTEXT.md) as one column and not as a tag beside a payload. An
-- `origin_kind` next to this would say what this already says, and two columns
-- that have to agree are two columns that one day will not -- which is ADR-0052's
-- argument about the close, where a row's presence is the whole fact and there
-- is no boolean beside it.
ALTER TABLE "movements" ADD COLUMN "carried_from" text;--> statement-breakpoint

-- A month is carried over once, and "once" is counted in rows that still stand.
--
-- Partial on `struck_at` deliberately, which is ADR-0031's shape for the other
-- thing a plan brings into existence: a Fixed item is paid only while the
-- Movement that paid it stands, and a carry-over is approved only while the
-- Movement it created stands. Striking one out is how it is undone -- there is
-- nothing to correct on it -- and an unconditional index would make that an undo
-- leading nowhere, with the month it came from offered again and refused.
--
-- It is the same guarantee `space_invitations_one_pending_per_space` makes for
-- the seat: the rule is about the live rows, so the index is about the live rows.
CREATE UNIQUE INDEX "movements_one_carry_over_per_month" ON "movements" USING btree ("space_id","carried_from") WHERE "movements"."carried_from" IS NOT NULL AND "movements"."struck_at" IS NULL;--> statement-breakpoint

-- Months are written the one way the whole product writes them, so that text
-- order and calendar order are one order. The same check `closed_months` makes,
-- and every walk backwards over months relies on it.
ALTER TABLE "movements" ADD CONSTRAINT "movements_carried_from_is_a_month" CHECK ("movements"."carried_from" IS NULL
        OR "movements"."carried_from" ~ '^\d{4}-(0[1-9]|1[0-2])$');--> statement-breakpoint

-- **Origin**, as the one rule that makes the nullable column above a shape
-- rather than a hole: a Movement came from a Member, or it came from the
-- Carry-over of a month, and never from both or from neither.
--
-- ADR-0003 is explicit about why this matters downstream: "any report about what
-- each Member contributed must filter on `origin`, which is the reason Movements
-- carry that field at all". A report reads the rows where `attributed_to` is a
-- name, and this is what guarantees the rest are exactly the carried ones rather
-- than rows something forgot to fill in.
ALTER TABLE "movements" ADD CONSTRAINT "movements_comes_from_a_member_or_from_a_month" CHECK (("movements"."carried_from" IS NULL AND "movements"."attributed_to" IS NOT NULL)
        OR ("movements"."carried_from" IS NOT NULL AND "movements"."attributed_to" IS NULL));--> statement-breakpoint

-- A surplus is money that still exists and can be spent again, so it comes back
-- as income and never as an expense (ADR-0003). Taken with
-- `movements_expense_is_filed_and_income_is_not`, this is also what says a
-- carry-over carries no Category: income is filed nowhere (ADR-0016), and there
-- is no Category in the catalogue a month's leftover would belong under.
ALTER TABLE "movements" ADD CONSTRAINT "movements_a_carry_over_is_income" CHECK ("movements"."carried_from" IS NULL OR "movements"."direction" = 'income');--> statement-breakpoint

-- It lands in a month *after* the one it came out of, which is the whole
-- direction of the act said in the place no code path can talk its way past.
-- The domain dates it the first day of the following month; this refuses the
-- carry-over that would land inside its own month, which is the one arithmetic
-- error that would make a month's figures include their own leftover.
--
-- Written the way `closed_months_is_closed_after_it_ended` is: the month a date
-- falls in is a fact this column can be compared against without a second
-- column to hold it.
ALTER TABLE "movements" ADD CONSTRAINT "movements_a_carry_over_lands_after_its_month" CHECK ("movements"."carried_from" IS NULL
        OR to_char("movements"."occurred_on", 'YYYY-MM') > "movements"."carried_from");--> statement-breakpoint

-- The rule that keeps one Space's money out of another's ledger, now that
-- attribution can be absent.
--
-- Replaced whole rather than added beside, exactly as 0005 replaced it when a
-- Category became optional: there is one answer to "does this Movement belong to
-- this Space" and not two that can drift. And the answer for a Member who is not
-- there is unchanged -- what is new is that "nobody" is a Member who is not
-- there, and nobody is who a carry-over belongs to.
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

	-- Skipped when there is nobody, and there is nobody on exactly one kind of
	-- row: the carry-over (ADR-0003). `movements_comes_from_a_member_or_from_a_month`
	-- is what says so, so this is not a second decision about when it may be
	-- absent -- it is this rule saying that an absent Member is not a Member of
	-- another Space.
	IF NEW.attributed_to IS NOT NULL AND NOT EXISTS (
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

-- Where a Movement came from is as unchangeable as which way its money went,
-- and it follows from the same argument (ADR-0016). A row that stopped being a
-- carry-over would have to invent a Member to be attributed to; one that became
-- a carry-over would have to throw its Member away. Neither is a correction --
-- it is a different entry, and ADR-0015 already made unmaking one cheap and
-- honest.
--
-- The domain refuses it in `amendMovement`, which refuses the whole correction
-- rather than this one field: there is nothing on a carry-over a correction
-- could be about. This refuses it for every path that never goes through the
-- domain, the way the recorder's trigger and the direction's do.
--
-- Its own function and not a line inside `movement_direction_is_immutable`, for
-- the reason 0005 gives about that one: a function whose name says "direction"
-- and whose body refuses something else is a name that stops being read.
CREATE FUNCTION movement_origin_is_immutable() RETURNS trigger AS $$
BEGIN
	IF NEW.carried_from IS DISTINCT FROM OLD.carried_from THEN
		RAISE EXCEPTION 'Where a Movement came from can never be changed (#120): % came from %, not %. Strike it out and approve it again instead.', OLD.id, COALESCE(OLD.carried_from, 'a Member'), COALESCE(NEW.carried_from, 'a Member');
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER movement_origin_is_immutable
	BEFORE UPDATE ON "movements"
	FOR EACH ROW EXECUTE FUNCTION movement_origin_is_immutable();
