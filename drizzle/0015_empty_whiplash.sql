CREATE TABLE "user_vault" (
	"user_id" text PRIMARY KEY NOT NULL,
	"kdf_version" smallint DEFAULT 1 NOT NULL,
	"salt" text NOT NULL,
	"mem_kib" integer NOT NULL,
	"iterations" integer NOT NULL,
	"parallelism" integer NOT NULL,
	"dek_wrapped_pw" text NOT NULL,
	"dek_wrapped_recovery" text NOT NULL,
	"birth_date_ct" text,
	"updated_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT "user_vault_kdf_version" CHECK ("user_vault"."kdf_version" = 1)
);
--> statement-breakpoint
ALTER TABLE "category" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "category_percent" ALTER COLUMN "percent_micro" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_goal" ALTER COLUMN "monthly_income_cents" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_goal" ALTER COLUMN "saved_cents" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_goal" ALTER COLUMN "retirement_age" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_goal" ALTER COLUMN "annual_rate_bp" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_goal" ALTER COLUMN "withdrawal_rate_bp" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "subcategory" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "transaction" ALTER COLUMN "amount_cents" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "category" ADD COLUMN "name_ct" text;--> statement-breakpoint
ALTER TABLE "category_percent" ADD COLUMN "percent_ct" text;--> statement-breakpoint
ALTER TABLE "financial_goal" ADD COLUMN "monthly_income_ct" text;--> statement-breakpoint
ALTER TABLE "financial_goal" ADD COLUMN "saved_ct" text;--> statement-breakpoint
ALTER TABLE "financial_goal" ADD COLUMN "retirement_age_ct" text;--> statement-breakpoint
ALTER TABLE "financial_goal" ADD COLUMN "annual_rate_ct" text;--> statement-breakpoint
ALTER TABLE "financial_goal" ADD COLUMN "withdrawal_rate_ct" text;--> statement-breakpoint
ALTER TABLE "subcategory" ADD COLUMN "name_ct" text;--> statement-breakpoint
ALTER TABLE "transaction" ADD COLUMN "amount_ct" text;--> statement-breakpoint
ALTER TABLE "transaction" ADD COLUMN "description_ct" text;--> statement-breakpoint
ALTER TABLE "user_vault" ADD CONSTRAINT "user_vault_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_name_plain_xor_ct" CHECK (("category"."name" IS NULL) <> ("category"."name_ct" IS NULL));--> statement-breakpoint
ALTER TABLE "category_percent" ADD CONSTRAINT "category_percent_plain_xor_ct" CHECK (("category_percent"."percent_micro" IS NULL) <> ("category_percent"."percent_ct" IS NULL));--> statement-breakpoint
ALTER TABLE "financial_goal" ADD CONSTRAINT "financial_goal_plain_xor_ct" CHECK ((
        "financial_goal"."monthly_income_cents" IS NOT NULL AND "financial_goal"."saved_cents" IS NOT NULL AND "financial_goal"."retirement_age" IS NOT NULL
        AND "financial_goal"."annual_rate_bp" IS NOT NULL AND "financial_goal"."withdrawal_rate_bp" IS NOT NULL
        AND "financial_goal"."monthly_income_ct" IS NULL AND "financial_goal"."saved_ct" IS NULL AND "financial_goal"."retirement_age_ct" IS NULL
        AND "financial_goal"."annual_rate_ct" IS NULL AND "financial_goal"."withdrawal_rate_ct" IS NULL
      ) OR (
        "financial_goal"."monthly_income_cents" IS NULL AND "financial_goal"."saved_cents" IS NULL AND "financial_goal"."retirement_age" IS NULL
        AND "financial_goal"."annual_rate_bp" IS NULL AND "financial_goal"."withdrawal_rate_bp" IS NULL
        AND "financial_goal"."monthly_income_ct" IS NOT NULL AND "financial_goal"."saved_ct" IS NOT NULL AND "financial_goal"."retirement_age_ct" IS NOT NULL
        AND "financial_goal"."annual_rate_ct" IS NOT NULL AND "financial_goal"."withdrawal_rate_ct" IS NOT NULL
      ));--> statement-breakpoint
ALTER TABLE "subcategory" ADD CONSTRAINT "subcategory_name_plain_xor_ct" CHECK (("subcategory"."name" IS NULL) <> ("subcategory"."name_ct" IS NULL));--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_amount_plain_xor_ct" CHECK (("transaction"."amount_cents" IS NULL) <> ("transaction"."amount_ct" IS NULL));--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_description_not_both" CHECK ("transaction"."description" IS NULL OR "transaction"."description_ct" IS NULL);