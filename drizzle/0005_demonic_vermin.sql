CREATE TABLE "financial_goal" (
	"user_id" text PRIMARY KEY NOT NULL,
	"monthly_income_cents" bigint NOT NULL,
	"saved_cents" bigint NOT NULL,
	"birth_date" date NOT NULL,
	"retirement_age" smallint NOT NULL,
	"updated_at" timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
	CONSTRAINT "financial_goal_income_range" CHECK ("financial_goal"."monthly_income_cents" BETWEEN 1 AND 100000000),
	CONSTRAINT "financial_goal_saved_range" CHECK ("financial_goal"."saved_cents" BETWEEN 0 AND 99999999999),
	CONSTRAINT "financial_goal_retirement_age_range" CHECK ("financial_goal"."retirement_age" BETWEEN 1 AND 120)
);
--> statement-breakpoint
ALTER TABLE "financial_goal" ADD CONSTRAINT "financial_goal_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;