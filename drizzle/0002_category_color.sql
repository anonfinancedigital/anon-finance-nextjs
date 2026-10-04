ALTER TABLE "category" ADD COLUMN "color" integer;--> statement-breakpoint
UPDATE "category" SET "color" = ranked."color" FROM (SELECT "id", ((row_number() OVER (PARTITION BY "user_id" ORDER BY "created_at", "id") - 1) % 8) + 1 AS "color" FROM "category") AS ranked WHERE "category"."id" = ranked."id";--> statement-breakpoint
ALTER TABLE "category" ALTER COLUMN "color" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_color_range" CHECK ("category"."color" BETWEEN 1 AND 8);
