-- Spaces and their Members (#4). A Space holds one or two Members, one
-- currency, and everything recorded in it.
CREATE TABLE "space_members" (
	"space_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "space_members_space_id_member_id_pk" PRIMARY KEY("space_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "spaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"currency" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "space_members" ADD CONSTRAINT "space_members_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "space_members" ADD CONSTRAINT "space_members_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- ADR-0001: a Space's currency is chosen at creation and can never change.
-- The domain refuses the change in `amendSpace`, and this refuses it for every
-- path that never goes through the domain -- a migration, a psql session, a
-- future query written in a hurry. There is no rate that makes an old expense
-- true in a new currency, so the safe answer is that the UPDATE simply fails.
CREATE FUNCTION space_currency_is_immutable() RETURNS trigger AS $$
BEGIN
	IF NEW.currency IS DISTINCT FROM OLD.currency THEN
		RAISE EXCEPTION 'A Space currency can never be changed (ADR-0001): % is denominated in %, not %.', OLD.id, OLD.currency, NEW.currency;
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER space_currency_is_immutable
	BEFORE UPDATE ON "spaces"
	FOR EACH ROW EXECUTE FUNCTION space_currency_is_immutable();
