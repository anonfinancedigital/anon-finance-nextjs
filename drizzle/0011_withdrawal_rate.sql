ALTER TABLE "financial_goal" ADD COLUMN "withdrawal_rate_bp" smallint;--> statement-breakpoint
UPDATE "financial_goal" SET "withdrawal_rate_bp" = CASE "annual_rate_bp" WHEN 600 THEN 400 WHEN 800 THEN 600 WHEN 1000 THEN 700 END;--> statement-breakpoint
ALTER TABLE "financial_goal" ALTER COLUMN "withdrawal_rate_bp" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_goal" DROP CONSTRAINT "financial_goal_annual_rate";--> statement-breakpoint
ALTER TABLE "financial_goal" ADD CONSTRAINT "financial_goal_annual_rate" CHECK ("financial_goal"."annual_rate_bp" BETWEEN 100 AND 1500);--> statement-breakpoint
ALTER TABLE "financial_goal" ADD CONSTRAINT "financial_goal_withdrawal_rate" CHECK ("financial_goal"."withdrawal_rate_bp" BETWEEN 100 AND 1500 AND "financial_goal"."withdrawal_rate_bp" <= "financial_goal"."annual_rate_bp");
