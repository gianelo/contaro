-- Every Budget item is called something (#79).
--
-- The name stopped belonging to the Fixed kind. A row is read by its name and
-- not by its Category: four weeks of groceries under "Súper" were four
-- identical lines, a plan a person could read down but not correct, because
-- nothing on the screen said which of them was the week they meant. So `name`
-- is now asked of both kinds, and the check says so once for the whole table
-- instead of once inside the Fixed branch.
--
-- The old check demanded `name is null` for a Variable row, so it refuses
-- exactly what this ticket writes. It is dropped first for that reason and not
-- for tidiness -- no row can carry a Variable name while it stands.
--
-- Dropping it also closes a hole rather than only moving a rule. In Postgres a
-- CHECK that evaluates to NULL is *satisfied*, so `char_length(btrim(name)) > 0`
-- was never a rule about a missing name: it refused a blank one and let a null
-- one straight through, and a Fixed item called nothing has been writable since
-- 0009. `name is not null` is written out first here, which is what makes the
-- rest of that expression mean what it always looked like it meant.
--
-- What an existing Variable row should be called is the surprising part, and it
-- is the reason for the function below. Until now such a row was drawn as its
-- Category, so its Category's name is what it has been called all along -- but
-- for a shipped Category that name was never in the database. `categories`
-- splits naming in two (`categories_shipped_or_typed`): a Space's own Category
-- carries `name`, and a shipped one carries `slug` and no name at all, because
-- its name is copy the screen resolves through `category.<slug>` so that a
-- second language is a file and not a migration. Most plans are set on the
-- shipped catalogue, so reading `categories.name` alone would name nearly every
-- existing row with a UUID -- and worse than leaving them, because the screen
-- used to resolve the slug to "Supermercado" and would then show the identifier
-- forever.
--
-- So the backfill borrows the catalogue's Spanish once, here, and freezes it.
-- That is honest: it is exactly what was on the screen the day this ran, and
-- the row is editable from that day on. The frozen copy is a historical record
-- of what a row was drawn as and never a second source of truth -- a later
-- rewording of `category.food` does not chase these rows, and should not, since
-- by then a person has had every chance to correct the ones they care about.
-- The mapping is exhaustive over the seed in 0003, all twenty-three slugs, and
-- a missed one would silently become a UUID; `src/i18n/category.test.ts` reads
-- the CASE below against that seed and fails on an arm this file is missing or
-- an arm 0003 never shipped. The labels themselves are held to nothing, and
-- that is the point of freezing them: they record what the screen said the day
-- this ran, so `category.food` stays free to be reworded without dragging
-- these rows along, and a test pinning the two together would forbid exactly
-- the rewording ADR-0042 says is fine.
--
-- The backfill runs over both kinds and not only the Variable ones, which the
-- hole above is the whole reason for. A Fixed row is not "drawn as its
-- Category" the way a Variable one is -- it has been asked for a name since
-- 0009 and the screen has read that name ever since -- so for it the frozen
-- copy is not a record of what anybody saw. It is still the right fallback:
-- the Category is the only readable thing a nameless row carries, and a row
-- that reached here nameless was never named by anybody, so there is nothing
-- of a person's to overwrite. Leaving these rows to `kind = 'variable'` would
-- hand `ADD CONSTRAINT` below the one thing it refuses, and it would find it
-- mid-deploy -- which is the failure ADR-0008's whole discipline exists to
-- prevent.
--
-- The rule lives in one function rather than being written twice, because the
-- backfill and the bridge below have to say the same thing and two copies of a
-- rule are two chances to disagree. The outer COALESCE at each call site is for
-- the case the function's own SELECT finds no row at all, so neither path can
-- write the NULL the new check refuses.
--
-- The column stays nullable, and the trigger at the end is why. ADR-0008 runs
-- migrations from an Action while Vercel deploys in parallel, so for a few
-- minutes the code of #10 -- which has never heard of naming a Variable item
-- -- is still inserting here without one. 0009 bridged that window for `kind`
-- with `DEFAULT 'variable'` and 0011 dropped it; a column DEFAULT cannot do it
-- here, because the honest name is read off another column of the same row.
-- A BEFORE INSERT trigger says the same rule the backfill says, for exactly as
-- long as those writes last.
--
-- All three are a bridge with one expiry: the contraction drops the trigger,
-- its function, and `budget_item_name_for_category` with them, and adds
-- `ALTER COLUMN "name" SET NOT NULL` -- what 0007 was to 0005 and 0011 was to
-- 0009. The frozen names stay; it is the machinery for producing them that
-- goes. Drizzle does not manage triggers or functions, so this half is
-- hand-written and drizzle-kit will neither reproduce nor drop it.
ALTER TABLE "budget_items" DROP CONSTRAINT "budget_items_carries_what_its_kind_carries";--> statement-breakpoint
CREATE FUNCTION "budget_item_name_for_category"("category" uuid) RETURNS text AS $$
  SELECT COALESCE(
    "categories"."name",
    CASE "categories"."slug"
      WHEN 'food' THEN 'Comida'
      WHEN 'home' THEN 'Hogar'
      WHEN 'transport' THEN 'Transporte'
      WHEN 'health' THEN 'Salud'
      WHEN 'leisure' THEN 'Ocio'
      WHEN 'personal' THEN 'Personal'
      WHEN 'education' THEN 'Educación'
      WHEN 'pets' THEN 'Mascotas'
      WHEN 'other' THEN 'Otros'
      WHEN 'food.groceries' THEN 'Supermercado'
      WHEN 'food.dining' THEN 'Restaurantes y delivery'
      WHEN 'home.rent' THEN 'Alquiler'
      WHEN 'home.utilities' THEN 'Servicios'
      WHEN 'home.upkeep' THEN 'Expensas y mantenimiento'
      WHEN 'transport.fuel' THEN 'Nafta'
      WHEN 'transport.public' THEN 'Transporte público'
      WHEN 'transport.vehicle' THEN 'Auto y moto'
      WHEN 'health.pharmacy' THEN 'Farmacia'
      WHEN 'health.care' THEN 'Consultas y estudios'
      WHEN 'leisure.outings' THEN 'Salidas'
      WHEN 'leisure.subscriptions' THEN 'Suscripciones'
      WHEN 'personal.clothing' THEN 'Ropa'
      WHEN 'personal.grooming' THEN 'Cuidado personal'
    END,
    "category"::text
  )
  FROM "categories" WHERE "categories"."id" = "category";
$$ LANGUAGE sql STABLE;--> statement-breakpoint
UPDATE "budget_items" SET "name" = COALESCE(
  "budget_item_name_for_category"("category_id"),
  "category_id"::text
)
WHERE "name" IS NULL OR btrim("name") = '';--> statement-breakpoint
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_carries_what_its_kind_carries" CHECK ("budget_items"."name" is not null
        and char_length(btrim("budget_items"."name")) > 0
        and (
          (
            "budget_items"."kind" = 'variable'
            and "budget_items"."due_on" is null
            and "budget_items"."movement_id" is null
          ) or (
            "budget_items"."kind" = 'fixed'
            and "budget_items"."due_on" is not null
          )
        ));--> statement-breakpoint
CREATE FUNCTION "budget_item_is_called_something"() RETURNS trigger AS $$
BEGIN
  IF NEW."name" IS NULL OR btrim(NEW."name") = '' THEN
    NEW."name" := COALESCE(
      "budget_item_name_for_category"(NEW."category_id"),
      NEW."category_id"::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "budget_item_is_called_something"
  BEFORE INSERT ON "budget_items"
  FOR EACH ROW EXECUTE FUNCTION "budget_item_is_called_something"();
