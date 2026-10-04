ALTER TABLE "transaction" ADD COLUMN "recurring" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "transaction" ADD COLUMN "recurrence_day" smallint;--> statement-breakpoint
ALTER TABLE "transaction" ADD COLUMN "recurrence_end" date;--> statement-breakpoint
ALTER TABLE "transaction" ADD COLUMN "series_id" uuid;--> statement-breakpoint
CREATE INDEX "transaction_user_recurring_idx" ON "transaction" USING btree ("user_id","date") WHERE "transaction"."recurring";--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_recurring_fields" CHECK ("transaction"."recurring" = ("transaction"."recurrence_day" IS NOT NULL) AND "transaction"."recurring" = ("transaction"."series_id" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_recurrence_day_range" CHECK ("transaction"."recurrence_day" BETWEEN 1 AND 31);--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_recurrence_end" CHECK ("transaction"."recurrence_end" IS NULL OR ("transaction"."recurring" AND "transaction"."recurrence_end" >= date_trunc('month', "transaction"."date")::date));