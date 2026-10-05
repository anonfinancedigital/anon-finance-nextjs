ALTER TABLE "category" DROP CONSTRAINT "category_percent_bp_range";--> statement-breakpoint
ALTER TABLE "category" RENAME COLUMN "percent_bp" TO "percent_micro";--> statement-breakpoint
UPDATE "category" SET "percent_micro" = "percent_micro" * 10000;--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_percent_micro_range" CHECK ("category"."percent_micro" BETWEEN 1 AND 100000000);
