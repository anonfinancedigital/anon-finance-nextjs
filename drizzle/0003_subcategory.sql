CREATE TABLE "subcategory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"category_id" uuid NOT NULL,
	"name" varchar(40) NOT NULL,
	"created_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT "subcategory_id_category_unique" UNIQUE("id","category_id")
);
--> statement-breakpoint
ALTER TABLE "transaction" ADD COLUMN "subcategory_id" uuid;--> statement-breakpoint
ALTER TABLE "subcategory" ADD CONSTRAINT "subcategory_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcategory" ADD CONSTRAINT "subcategory_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "subcategory_category_lower_name_unique" ON "subcategory" USING btree ("category_id",lower("name"));--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_subcategory_category_fk" FOREIGN KEY ("subcategory_id","category_id") REFERENCES "public"."subcategory"("id","category_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_subcategory_needs_category" CHECK ("transaction"."subcategory_id" IS NULL OR "transaction"."category_id" IS NOT NULL);