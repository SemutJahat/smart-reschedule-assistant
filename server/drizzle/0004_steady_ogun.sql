ALTER TABLE "payments" ADD COLUMN "package_id" uuid;--> statement-breakpoint
UPDATE "payments" AS p
SET "package_id" = s."package_id"
FROM "subscriptions" AS s
WHERE p."subscription_id" = s."id" AND p."package_id" IS NULL;--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "payments" WHERE "package_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot migrate payments: one or more payments have no subscription and cannot be mapped to a package';
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "package_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payments_package_idx" ON "payments" USING btree ("package_id");
