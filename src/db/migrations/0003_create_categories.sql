CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid,
	"parent_id" uuid,
	"slug" text,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug"),
	CONSTRAINT "categories_shipped_or_typed" CHECK (("categories"."space_id" IS NULL AND "categories"."slug" IS NOT NULL AND "categories"."name" IS NULL)
        OR ("categories"."space_id" IS NOT NULL AND "categories"."slug" IS NULL AND "categories"."name" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "categories_space_id_idx" ON "categories" USING btree ("space_id");
--> statement-breakpoint
-- #6: a Category may hold subcategories, and a subcategory may not hold any of
-- its own. Two levels is what the product describes and what a Budget on a
-- parent can cover without a walk nobody can picture (#10).
--
-- The other half is whose Category may hold whose: a Space's Category may sit
-- under a shipped one or under another of that same Space's, and never under
-- another Space's. A composite foreign key would enforce "the same Space" but
-- would also forbid the shipped parent, which is the ordinary case -- so the
-- rule is a trigger, the way ADR-0001's is, and it holds for every path into
-- this table rather than only the one that goes through the domain.
CREATE FUNCTION category_parent_is_a_visible_heading() RETURNS trigger AS $$
DECLARE
	parent_space uuid;
	parent_parent uuid;
	parent_found boolean;
BEGIN
	IF NEW.parent_id IS NULL THEN
		RETURN NEW;
	END IF;

	SELECT space_id, parent_id, true INTO parent_space, parent_parent, parent_found
		FROM categories WHERE id = NEW.parent_id;

	-- The foreign key has already refused a parent that does not exist; this is
	-- what happens if it is ever dropped.
	IF parent_found IS NULL THEN
		RAISE EXCEPTION 'Category % would go under %, which does not exist.', NEW.id, NEW.parent_id;
	END IF;

	IF parent_parent IS NOT NULL THEN
		RAISE EXCEPTION 'A subcategory cannot hold subcategories (#6): % is already under %.', NEW.parent_id, parent_parent;
	END IF;

	IF parent_space IS NOT NULL AND parent_space IS DISTINCT FROM NEW.space_id THEN
		RAISE EXCEPTION 'A Category cannot go under one belonging to another Space (#6): % is in %, not %.', NEW.parent_id, parent_space, NEW.space_id;
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER category_parent_is_a_visible_heading
	BEFORE INSERT OR UPDATE ON "categories"
	FOR EACH ROW EXECUTE FUNCTION category_parent_is_a_visible_heading();
--> statement-breakpoint
-- The global catalogue every Space is born with (#6, story 12 in #1). Rows and
-- not code, so #7's Movement and #10's Budget item point at one foreign key --
-- and a Space created before a Category was added still sees it, because there
-- is one copy of the catalogue rather than one per Space.
--
-- The identifiers are written out rather than generated: every environment
-- names the same Category by the same id, so a Movement recorded against
-- "Supermercado" in preview means the same thing in production. Names are not
-- here at all -- a shipped Category carries the key `category.<slug>` and is
-- translated like every other piece of copy, so a second language is a file
-- and not a migration.
INSERT INTO "categories" ("id", "space_id", "parent_id", "slug", "name") VALUES
	('c0000000-0000-4000-8000-000000000001', NULL, NULL, 'food', NULL),
	('c0000000-0000-4000-8000-000000000002', NULL, NULL, 'home', NULL),
	('c0000000-0000-4000-8000-000000000003', NULL, NULL, 'transport', NULL),
	('c0000000-0000-4000-8000-000000000004', NULL, NULL, 'health', NULL),
	('c0000000-0000-4000-8000-000000000005', NULL, NULL, 'leisure', NULL),
	('c0000000-0000-4000-8000-000000000006', NULL, NULL, 'personal', NULL),
	('c0000000-0000-4000-8000-000000000007', NULL, NULL, 'education', NULL),
	('c0000000-0000-4000-8000-000000000008', NULL, NULL, 'pets', NULL),
	('c0000000-0000-4000-8000-000000000009', NULL, NULL, 'other', NULL);
--> statement-breakpoint
INSERT INTO "categories" ("id", "space_id", "parent_id", "slug", "name") VALUES
	('c0000000-0000-4000-8000-000000000101', NULL, 'c0000000-0000-4000-8000-000000000001', 'food.groceries', NULL),
	('c0000000-0000-4000-8000-000000000102', NULL, 'c0000000-0000-4000-8000-000000000001', 'food.dining', NULL),
	('c0000000-0000-4000-8000-000000000201', NULL, 'c0000000-0000-4000-8000-000000000002', 'home.rent', NULL),
	('c0000000-0000-4000-8000-000000000202', NULL, 'c0000000-0000-4000-8000-000000000002', 'home.utilities', NULL),
	('c0000000-0000-4000-8000-000000000203', NULL, 'c0000000-0000-4000-8000-000000000002', 'home.upkeep', NULL),
	('c0000000-0000-4000-8000-000000000301', NULL, 'c0000000-0000-4000-8000-000000000003', 'transport.fuel', NULL),
	('c0000000-0000-4000-8000-000000000302', NULL, 'c0000000-0000-4000-8000-000000000003', 'transport.public', NULL),
	('c0000000-0000-4000-8000-000000000303', NULL, 'c0000000-0000-4000-8000-000000000003', 'transport.vehicle', NULL),
	('c0000000-0000-4000-8000-000000000401', NULL, 'c0000000-0000-4000-8000-000000000004', 'health.pharmacy', NULL),
	('c0000000-0000-4000-8000-000000000402', NULL, 'c0000000-0000-4000-8000-000000000004', 'health.care', NULL),
	('c0000000-0000-4000-8000-000000000501', NULL, 'c0000000-0000-4000-8000-000000000005', 'leisure.outings', NULL),
	('c0000000-0000-4000-8000-000000000502', NULL, 'c0000000-0000-4000-8000-000000000005', 'leisure.subscriptions', NULL),
	('c0000000-0000-4000-8000-000000000601', NULL, 'c0000000-0000-4000-8000-000000000006', 'personal.clothing', NULL),
	('c0000000-0000-4000-8000-000000000602', NULL, 'c0000000-0000-4000-8000-000000000006', 'personal.grooming', NULL);
