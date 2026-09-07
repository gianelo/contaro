-- A month can be closed, and nothing in it changes afterwards (#117).
--
-- ADR-0002 decided the close years before there was anywhere to record one:
-- "nothing inside a closed month can be edited and no Movement can be added to
-- it", and no unlock. ADR-0019 then said where it would live -- "the close gets
-- its own home when its ticket arrives, and it will be a home the Movements can
-- see too" -- because its subject is the month, and a flag on a Budget would be
-- a flag that half of what it freezes does not point at. A month with no plan at
-- all can still be closed. This is that home.
--
-- The row is the whole fact. There is no `closed` boolean and nothing to unset:
-- a month is closed if it has a row here, and every month without one is open,
-- including the ones nobody has reached yet. ADR-0029 refused a flag in these
-- words -- "a flag has to be unset somewhere else" -- and the same argument
-- lands here twice over, because unsetting this one would be the unlock ADR-0002
-- forbids.
--
-- `closed_by` does not cascade from `members`, the way `spaces.created_by` and
-- `space_invitations.invited_by` do not: the act cannot be undone, so the Space
-- is owed an honest record of who performed it even if that Member's own row is
-- one day gone. It cascades from `spaces` because a Space that is gone has no
-- months.
--
-- Two days rather than one, and they are not the same question. `closed_on` is
-- the day the Reader was standing in when they decided the month was finished
-- (ADR-0018); `closed_at` is when the row reached the database. At nine at night
-- on the 30th in Bogota those are two different days, and the one worth reading
-- back is theirs.
--
-- A whole new table, so ADR-0008 holds without an expand step: a deploy that has
-- not caught up writes nothing here and reads nothing from it, and the triggers
-- below refuse only writes into months that this deploy's code was the first
-- thing able to close.

CREATE TABLE "closed_months" (
	"space_id" uuid NOT NULL,
	"month" text NOT NULL,
	"closed_by" uuid NOT NULL,
	"closed_on" date NOT NULL,
	"closed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "closed_months_space_id_month_pk" PRIMARY KEY("space_id","month"),
	CONSTRAINT "closed_months_month_is_a_month" CHECK ("closed_months"."month" ~ '^\d{4}-(0[1-9]|1[0-2])$'),
	CONSTRAINT "closed_months_is_closed_after_it_ended" CHECK (to_char("closed_months"."closed_on", 'YYYY-MM') > "closed_months"."month")
);
--> statement-breakpoint
ALTER TABLE "closed_months" ADD CONSTRAINT "closed_months_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "closed_months" ADD CONSTRAINT "closed_months_closed_by_members_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- The close has no undo, said where no code path can talk its way past it.
--
-- ADR-0002 is explicit: "Do not 'fix' it by back-dating Movements into closed
-- months or by adding an unlock: the guarantee that a closed month never changes
-- is the reason the close exists." A guarantee that only the domain enforces is
-- a guarantee that lasts until the second caller, so it is enforced here the way
-- 0002 freezes a Space's currency and 0015 freezes its creator.
--
-- INSERT is the only thing this table admits. The primary key already refuses a
-- second row for the same month; these refuse the two ways a row could be moved
-- or taken away.
CREATE FUNCTION a_closed_month_is_never_changed() RETURNS trigger AS $$
BEGIN
	RAISE EXCEPTION 'A closed month can never be reopened or moved (ADR-0002): % of % was closed on %.', OLD.month, OLD.space_id, OLD.closed_on;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER a_closed_month_is_never_changed
	BEFORE UPDATE ON "closed_months"
	FOR EACH ROW EXECUTE FUNCTION a_closed_month_is_never_changed();--> statement-breakpoint

-- A Space going away takes its months with it, and that is not a reopening.
--
-- The row cascades from `spaces`, so an unconditional refusal here would make a
-- Space that ever closed a month impossible to delete -- which is the exact
-- hazard named a few lines further down as the reason there is no trigger on
-- `budget_items` or `movements`, and it would be no better for being on this
-- table instead.
--
-- The two are told apart by asking whether the Space is still there. Postgres
-- runs a cascade as the parent's own delete, so by the time this fires the
-- `spaces` row is already gone from this transaction's view; a delete aimed at
-- this table alone leaves it standing. "The Space still exists and somebody is
-- removing its close" is the only thing refused, which is the only thing ADR-0002
-- was ever about: there is no unlock, and a Space that no longer exists has
-- nothing left to unlock.
CREATE FUNCTION a_closed_month_is_never_reopened() RETURNS trigger AS $$
BEGIN
	IF EXISTS (SELECT 1 FROM spaces WHERE id = OLD.space_id) THEN
		RAISE EXCEPTION 'A closed month can never be reopened (ADR-0002): % of % was closed on %.', OLD.month, OLD.space_id, OLD.closed_on;
	END IF;

	RETURN OLD;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER a_closed_month_is_never_reopened
	BEFORE DELETE ON "closed_months"
	FOR EACH ROW EXECUTE FUNCTION a_closed_month_is_never_reopened();--> statement-breakpoint

-- The month's own rows are frozen above this, in one place: every write in
-- `src/db/budget-items.ts` and `src/db/movements.ts` asks `refuseAClosedMonth`
-- before it writes, and `closed-months.source.test.ts` fails the day one of them
-- forgets to. It is not asked again here, deliberately.
--
-- A trigger on `budget_items` and `movements` would be the obvious second belt,
-- and it is the wrong one: those tables cascade from `spaces`, so a trigger
-- refusing every DELETE inside a closed month would make a Space that ever
-- closed one impossible to delete. It would also give a person the same blank
-- apology for a rule the product has a sentence for. The rule that is enforced
-- here is the one that cannot be expressed anywhere else -- that this table's
-- own rows never move -- and the rule about the month's contents is enforced
-- where the month is known and a refusal can be read out loud.
