ALTER TABLE "user" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "decided_at" timestamp;--> statement-breakpoint
UPDATE "user" SET "status" = 'approved';--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_status_valid" CHECK ("user"."status" IN ('pending', 'approved', 'rejected', 'revoked'));
