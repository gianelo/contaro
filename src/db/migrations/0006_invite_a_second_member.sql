-- Inviting a second Member to a Space (#9).
--
-- An Invitation is the offer of the Space's one free seat, addressed to an
-- email address rather than to a Member: the person invited may never have
-- used contaro at all. It holds the seat while it waits, and the person it
-- names is the only one who can take it (ADR-0017).
--
-- Nothing is dropped and nothing is rewritten, so a deploy that has not caught
-- up keeps working exactly as it did (ADR-0008). The table is new, so no
-- running code reads or writes it. The trigger on `space_members` does sit on
-- an INSERT old code performs -- `createSpaceForMember` has written there
-- since #4 -- and it passes: that INSERT seats a Space's first Member, so the
-- count it refuses at two is zero.
CREATE TABLE "space_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"email" text NOT NULL,
	"invited_by" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "space_invitations_status_is_one_of_four" CHECK ("space_invitations"."status" IN ('pending', 'accepted', 'declined', 'revoked')),
	CONSTRAINT "space_invitations_answered_or_waiting" CHECK (("space_invitations"."status" = 'pending' AND "space_invitations"."resolved_at" IS NULL)
        OR ("space_invitations"."status" <> 'pending' AND "space_invitations"."resolved_at" IS NOT NULL)),
	CONSTRAINT "space_invitations_email_is_normalised" CHECK ("space_invitations"."email" = lower(btrim("space_invitations"."email")))
);
--> statement-breakpoint
ALTER TABLE "space_invitations" ADD CONSTRAINT "space_invitations_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_invitations" ADD CONSTRAINT "space_invitations_invited_by_members_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "space_invitations_one_pending_per_space" ON "space_invitations" USING btree ("space_id") WHERE "space_invitations"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "space_invitations_pending_email_idx" ON "space_invitations" USING btree ("email") WHERE "space_invitations"."status" = 'pending';--> statement-breakpoint
-- Who may send an Invitation. The domain refuses a stranger in
-- `inviteToSpace`; this refuses one for every path that never goes through the
-- domain, the way `movement_belongs_to_its_space` does for a Movement's two
-- Members. An Invitation whose sender was never in the Space is an offer of a
-- seat that was never theirs to offer.
CREATE FUNCTION invitation_is_sent_from_inside_its_space() RETURNS trigger AS $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM space_members
		WHERE space_id = NEW.space_id AND member_id = NEW.invited_by
	) THEN
		RAISE EXCEPTION 'Invitation % was sent by %, who is not a Member of %.', NEW.id, NEW.invited_by, NEW.space_id;
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER invitation_is_sent_from_inside_its_space
	BEFORE INSERT ON "space_invitations"
	FOR EACH ROW EXECUTE FUNCTION invitation_is_sent_from_inside_its_space();--> statement-breakpoint
-- A Space holds two Members and no more (#9). It is one person's money or a
-- couple's (CONTEXT.md), and the third person is another Space.
--
-- The unique index above gives a Space at most one Invitation outstanding, and
-- this gives it at most two Members: together they are "the seat", so an
-- Invitation accepted twice, or two accepted at once, cannot seat a third
-- person. `inviteToSpace` and `acceptInvitation` count the same rule in the
-- domain; this is what holds it against a psql session and against two
-- requests landing in the same millisecond.
CREATE FUNCTION space_holds_two_members_at_most() RETURNS trigger AS $$
DECLARE
	seated integer;
BEGIN
	-- The Space's own row is locked first, so two requests accepting into the
	-- same Space queue behind each other rather than each counting one Member
	-- and both passing. Counting without this is a check that is true at the
	-- moment it is asked and false by the time the row lands.
	PERFORM 1 FROM spaces WHERE id = NEW.space_id FOR UPDATE;

	-- The row being inserted is not visible here, so this counts everyone
	-- already seated and the question is "is there room for one more".
	SELECT count(*) INTO seated FROM space_members WHERE space_id = NEW.space_id;

	IF seated >= 2 THEN
		RAISE EXCEPTION 'A Space holds two Members at most (#9): % already holds %.', NEW.space_id, seated;
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER space_holds_two_members_at_most
	BEFORE INSERT ON "space_members"
	FOR EACH ROW EXECUTE FUNCTION space_holds_two_members_at_most();
