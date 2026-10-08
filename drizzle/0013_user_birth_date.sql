ALTER TABLE "user" ADD COLUMN "birth_date" date;--> statement-breakpoint
UPDATE "user" SET "birth_date" = g."birth_date" FROM "financial_goal" g WHERE g."user_id" = "user"."id";
