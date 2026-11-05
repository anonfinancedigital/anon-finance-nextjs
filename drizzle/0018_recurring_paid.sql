CREATE TABLE "recurring_paid" (
	"user_id" text NOT NULL,
	"series_id" uuid NOT NULL,
	"month" date NOT NULL,
	CONSTRAINT "recurring_paid_series_id_month_pk" PRIMARY KEY("series_id","month"),
	CONSTRAINT "recurring_paid_month_start" CHECK (EXTRACT(DAY FROM "recurring_paid"."month") = 1)
);
--> statement-breakpoint
ALTER TABLE "recurring_paid" ADD CONSTRAINT "recurring_paid_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recurring_paid_user_month_idx" ON "recurring_paid" USING btree ("user_id","month");--> statement-breakpoint
-- backfill
INSERT INTO "recurring_paid" ("user_id", "series_id", "month")
SELECT t."user_id", t."series_id", m::date
FROM "transaction" t
CROSS JOIN LATERAL generate_series(
	date_trunc('month', t."date"::timestamp),
	least(
		coalesce(t."recurrence_end"::timestamp, date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') - interval '1 month'),
		date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') - interval '1 month'
	),
	interval '1 month'
) AS m
WHERE t."recurring"
ON CONFLICT DO NOTHING;
