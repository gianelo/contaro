CREATE TABLE "movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"occurred_on" date NOT NULL,
	"recorded_by" uuid NOT NULL,
	"attributed_to" uuid NOT NULL,
	"struck_by" uuid,
	"struck_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "movements_amount_is_money_that_moved" CHECK ("movements"."amount" > 0),
	CONSTRAINT "movements_struck_or_standing" CHECK (("movements"."struck_by" IS NULL AND "movements"."struck_at" IS NULL)
        OR ("movements"."struck_by" IS NOT NULL AND "movements"."struck_at" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "movements" ADD CONSTRAINT "movements_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movements" ADD CONSTRAINT "movements_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movements" ADD CONSTRAINT "movements_recorded_by_members_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movements" ADD CONSTRAINT "movements_attributed_to_members_id_fk" FOREIGN KEY ("attributed_to") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movements" ADD CONSTRAINT "movements_struck_by_members_id_fk" FOREIGN KEY ("struck_by") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "movements_space_id_occurred_on_idx" ON "movements" USING btree ("space_id","occurred_on");
--> statement-breakpoint
-- #7, story 22 in #1: who typed a figure in is a fact about what happened, and
-- a fact that can be edited is not a record of anything. The domain refuses the
-- change in `amendMovement`; this refuses it for every path that never goes
-- through the domain, the way ADR-0001's trigger does for a Space's currency.
CREATE FUNCTION movement_recorder_is_immutable() RETURNS trigger AS $$
BEGIN
	IF NEW.recorded_by IS DISTINCT FROM OLD.recorded_by THEN
		RAISE EXCEPTION 'A Movement recorder can never be changed (#7): % was recorded by %, not %.', OLD.id, OLD.recorded_by, NEW.recorded_by;
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER movement_recorder_is_immutable
	BEFORE UPDATE ON "movements"
	FOR EACH ROW EXECUTE FUNCTION movement_recorder_is_immutable();
--> statement-breakpoint
-- The two rules that keep one Space's money out of another's ledger. Neither
-- is expressible as a foreign key: the Category may belong to this Space or to
-- nobody (#6's global catalogue), and membership lives in its own table.
--
-- A trigger and not a query, for the reason #6's is one: the domain decides
-- both of these over rows handed to it, and a rule only the domain knows about
-- holds until the second caller. This is the floor under `recordMovement`.
CREATE FUNCTION movement_belongs_to_its_space() RETURNS trigger AS $$
DECLARE
	category_space uuid;
	category_found boolean;
BEGIN
	SELECT space_id, true INTO category_space, category_found
		FROM categories WHERE id = NEW.category_id;

	-- The foreign key has already refused a Category that does not exist; this
	-- is what happens if it is ever dropped.
	IF category_found IS NULL THEN
		RAISE EXCEPTION 'Movement % is filed under %, which does not exist.', NEW.id, NEW.category_id;
	END IF;

	IF category_space IS NOT NULL AND category_space IS DISTINCT FROM NEW.space_id THEN
		RAISE EXCEPTION 'A Movement cannot be filed under a Category belonging to another Space (#6): % is in %, not %.', NEW.category_id, category_space, NEW.space_id;
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
CREATE TRIGGER movement_belongs_to_its_space
	BEFORE INSERT OR UPDATE ON "movements"
	FOR EACH ROW EXECUTE FUNCTION movement_belongs_to_its_space();
