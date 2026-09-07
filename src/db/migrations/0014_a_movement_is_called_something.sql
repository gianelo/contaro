-- A Movement is called something, or it is called nothing (#66).
--
-- The month's list drew a column of Categories. Three trips to the same
-- supermarket were three identical rows, and the only thing telling them apart
-- was three different figures -- because a Movement had no name to be read by.
-- It has one now.
--
-- Nullable, and that is the whole argument rather than an oversight. A Budget
-- item's name is NOT NULL (0012, ADR-0042) because a plan is written sitting
-- down and a row with no name is a line a person cannot correct. A Movement is
-- recorded standing at a till on a screen ADR-0028 gives one thing to do and
-- ADR-0037 measures against the 664px a phone gives. Demanding a name there
-- would put a keyboard in front of the one entry the product cannot afford to
-- slow down, so the field is something a person may give and never something
-- they owe. A row without one is read by its Category, exactly as every row was
-- before this column. See ADR-0048.
--
-- The check is written with `name IS NULL OR ...` and not left to Postgres.
-- 0012 found that a CHECK evaluating to NULL is *satisfied*, so a bare
-- `char_length(btrim(name)) > 0` would be a rule about blanks that silently let
-- nulls past -- which is right here by accident and wrong the day somebody
-- reads the constraint to learn what the column means. Said out loud, the
-- constraint states the two things the column may be.
--
-- Sixty characters, which is `MAX_MOVEMENT_NAME_LENGTH` in the domain and the
-- same ceiling a Budget item already has: it is a label on a row, not a
-- description.
--
-- Expand only, so ADR-0008 holds: the column is nullable and the check admits
-- NULL, so the deploy that has not caught up goes on inserting without a name.

ALTER TABLE "movements" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "movements" ADD CONSTRAINT "movements_name_is_something_or_nothing" CHECK ("movements"."name" IS NULL
        OR (char_length(btrim("movements"."name")) > 0 AND char_length("movements"."name") <= 60));
