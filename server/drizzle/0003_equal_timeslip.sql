ALTER TABLE "packages" DROP CONSTRAINT "packages_price_nonnegative_chk";--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_price_positive_chk" CHECK ("packages"."price" > 0);