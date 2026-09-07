-- A Space remembers who created it (#116).
--
-- ADR-0020 made a Space's two Members deliberately symmetric, down to their
-- colours coming from sorted ids rather than from who arrived first. It still
-- stands. ADR-0051 gives it one named exception: closing a month and approving
-- the carry-over are the creator's, and the invited Member does neither. That
-- exception needs a creator to point at, and until now the product could not
-- name one -- `createSpace` took a `creatorId`, seeded `member_ids` with it,
-- and dropped it.
--
-- Here rather than a `role` on `space_members`, because it is a fact about the
-- Space and because a role column is a permission system growing out of two
-- acts and no more.
--
-- The foreign key does not cascade from `members`, the way
-- `space_invitations.invited_by` does not: the Space is owed an honest record
-- of who made it even if that Member's own row is one day gone.
--
-- Nullable, so ADR-0008 holds. A required column costs three deploys: this one
-- adds it and fills it, a later one makes it NOT NULL once nothing can write a
-- row without it. The bridge below is what keeps the window between them from
-- leaving a Space with no answer.
ALTER TABLE "spaces" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_created_by_members_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- The two signals, compared before either is trusted.
--
-- The creator's membership row is written in the same transaction as the Space
-- (`createSpaceForMember`) and `joined_at` defaults to now(), so the earliest
-- membership row per Space is the creator's. Independently, an Invitation
-- carries `invited_by`, and a Space with one Member has only that Member to do
-- the inviting -- so on any Space that ever invited, the two should agree.
--
-- Where they disagree, that is surfaced rather than silently resolved. Nothing
-- here invents a creator: the earliest membership row is the answer, because it
-- is the one signal every Space has, and a Space whose invitation says
-- otherwise is a fact somebody should look at rather than a row to overwrite
-- quietly. A WARNING and not an EXCEPTION -- ADR-0008 runs this from CI, and
-- refusing to deploy over a discrepancy in old data would block the fix along
-- with the problem.
DO $$
DECLARE
	disagreeing text;
BEGIN
	SELECT string_agg(space_id::text, ', ' ORDER BY space_id)
	INTO disagreeing
	FROM (
		SELECT
			m.space_id,
			(SELECT member_id FROM space_members earliest
				WHERE earliest.space_id = m.space_id
				ORDER BY earliest.joined_at, earliest.member_id
				LIMIT 1) AS joined_first,
			i.invited_by
		FROM (SELECT DISTINCT space_id FROM space_members) m
		JOIN LATERAL (
			SELECT invited_by FROM space_invitations
			WHERE space_invitations.space_id = m.space_id
			-- Tie broken on the id, so this reads the same Invitation twice
			-- running, exactly as the membership query above does.
			ORDER BY created_at, id
			LIMIT 1
		) i ON true
	) signals
	WHERE joined_first IS DISTINCT FROM invited_by;

	IF disagreeing IS NOT NULL THEN
		RAISE WARNING 'These Spaces disagree about who created them: the earliest membership row and the first Invitation name different Members (#116). The membership row was used. Spaces: %', disagreeing;
	END IF;
END $$;--> statement-breakpoint

-- The backfill. Recovered, not invented: the earliest membership row per Space.
UPDATE "spaces" SET "created_by" = (
	SELECT member_id FROM space_members
	WHERE space_members.space_id = spaces.id
	ORDER BY space_members.joined_at, space_members.member_id
	LIMIT 1
) WHERE "created_by" IS NULL;--> statement-breakpoint

-- What the backfill could not answer, said out loud for the same reason the
-- comparison above is: a Space with no membership row at all has no signal to
-- recover from, and inventing one would be worse than admitting it. It should
-- be none -- the Space and its creator's row are written in one transaction,
-- so a Space with nobody in it is a Space nobody can open -- and if it is ever
-- some, that is the fact worth having on the CI log rather than a column
-- quietly holding NULL.
DO $$
DECLARE
	unanswered text;
BEGIN
	SELECT string_agg(id::text, ', ' ORDER BY id)
	INTO unanswered
	FROM spaces WHERE created_by IS NULL;

	IF unanswered IS NOT NULL THEN
		RAISE WARNING 'These Spaces cannot say who created them: they hold no Member to recover the answer from (#116). Spaces: %', unanswered;
	END IF;
END $$;--> statement-breakpoint

-- The bridge across the window ADR-0008 opens, and it is the same rule the
-- backfill just ran: the first Member seated in a Space is its creator.
--
-- It cannot be a DEFAULT, the way 0009 bridged `kind`, because the honest value
-- is another row's and a default is a constant. It cannot be a trigger on
-- `spaces` either -- at the moment the Space is inserted its membership row does
-- not exist yet, since `createSpaceForMember` writes the Space first and seats
-- the creator second, in one transaction. So it hangs off the membership
-- insert, which is the first moment the answer exists.
--
-- Only when the column is still empty, so it never overwrites what the code of
-- #116 wrote, and never promotes the invited Member on a Space that already
-- has an answer. This comes down in a later migration, the way 0013 took down
-- 0012's, once no deploy can write a Space without a creator.
CREATE FUNCTION space_creator_is_its_first_member() RETURNS trigger AS $$
BEGIN
	UPDATE spaces
	SET created_by = NEW.member_id
	WHERE id = NEW.space_id AND created_by IS NULL;
	RETURN NULL;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER space_creator_is_its_first_member
	AFTER INSERT ON "space_members"
	FOR EACH ROW EXECUTE FUNCTION space_creator_is_its_first_member();--> statement-breakpoint

-- Recovered once and never handed over. ADR-0051's exception says the creator
-- decides two things the other Member cannot, so a column an UPDATE can move is
-- an exception anybody can award themselves. The domain never offers the change
-- -- `SpaceAmendment` has no field for it -- and this refuses it for every path
-- that never goes through the domain, exactly as 0002 does for the currency.
--
-- NULL to a value is allowed, because that is the bridge above and the deploy
-- that has not caught up. A value to anything else is not.
CREATE FUNCTION space_creator_is_immutable() RETURNS trigger AS $$
BEGIN
	IF OLD.created_by IS NOT NULL AND NEW.created_by IS DISTINCT FROM OLD.created_by THEN
		RAISE EXCEPTION 'A Space creator can never be changed (ADR-0051): % was created by %, not %.', OLD.id, OLD.created_by, NEW.created_by;
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER space_creator_is_immutable
	BEFORE UPDATE ON "spaces"
	FOR EACH ROW EXECUTE FUNCTION space_creator_is_immutable();
