DO $$ BEGIN
  ALTER TYPE "listing_category" ADD VALUE 'swap';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
