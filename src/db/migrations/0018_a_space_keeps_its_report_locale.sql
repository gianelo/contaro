ALTER TABLE "spaces" ADD COLUMN "locale" text DEFAULT 'es-CO' NOT NULL;--> statement-breakpoint

-- The current single-language scope uses es-CO for existing and new Spaces.
-- The DEFAULT bridges older deployments that do not yet write this field.
ALTER TABLE "spaces" ADD CONSTRAINT "space_report_locale_supported"
  CHECK (locale = 'es-CO');--> statement-breakpoint

-- Reports keep the same number conventions even when requested by another Member.
CREATE FUNCTION space_report_locale_is_immutable() RETURNS trigger AS $$
BEGIN
  IF NEW.locale IS DISTINCT FROM OLD.locale THEN
    RAISE EXCEPTION 'A Space locale can never be changed: % uses %.', OLD.id, OLD.locale;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER space_report_locale_is_immutable
  BEFORE UPDATE ON "spaces"
  FOR EACH ROW EXECUTE FUNCTION space_report_locale_is_immutable();
