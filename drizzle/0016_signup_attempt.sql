CREATE TABLE "signup_attempt" (
	"id" serial PRIMARY KEY NOT NULL,
	"ip_hash" text NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "signup_attempt_ip_hash_attempted_at_idx" ON "signup_attempt" USING btree ("ip_hash","attempted_at");