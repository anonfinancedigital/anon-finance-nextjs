CREATE TABLE "category_percent" (
	"category_id" uuid NOT NULL,
	"from_month" date NOT NULL,
	"percent_micro" integer NOT NULL,
	CONSTRAINT "category_percent_category_id_from_month_pk" PRIMARY KEY("category_id","from_month"),
	CONSTRAINT "category_percent_micro_range" CHECK ("category_percent"."percent_micro" BETWEEN 1 AND 100000000),
	CONSTRAINT "category_percent_month_start" CHECK (EXTRACT(DAY FROM "category_percent"."from_month") = 1)
);
--> statement-breakpoint
DROP INDEX "category_user_lower_name_unique";--> statement-breakpoint
ALTER TABLE "category" ALTER COLUMN "percent_micro" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "category" ADD COLUMN "deleted_from" date;--> statement-breakpoint
ALTER TABLE "category_percent" ADD CONSTRAINT "category_percent_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "category_percent" ("category_id", "from_month", "percent_micro") SELECT "id", '0001-01-01', "percent_micro" FROM "category";--> statement-breakpoint
CREATE UNIQUE INDEX "category_user_lower_name_unique" ON "category" USING btree ("user_id",lower("name")) WHERE "category"."deleted_from" IS NULL;