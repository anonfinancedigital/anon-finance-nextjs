CREATE TABLE "push_broadcast" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	CONSTRAINT "push_broadcast_text_length" CHECK (char_length("push_broadcast"."text") BETWEEN 1 AND 140)
);
--> statement-breakpoint
CREATE TABLE "push_dispatch" (
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"ref" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_dispatch_user_id_kind_ref_pk" PRIMARY KEY("user_id","kind","ref"),
	CONSTRAINT "push_dispatch_kind" CHECK ("push_dispatch"."kind" IN ('reminder', 'due', 'broadcast'))
);
--> statement-breakpoint
CREATE TABLE "push_preference" (
	"user_id" text PRIMARY KEY NOT NULL,
	"reminder" boolean DEFAULT false NOT NULL,
	"due" boolean DEFAULT false NOT NULL,
	"security" boolean DEFAULT true NOT NULL,
	"admin" boolean DEFAULT true NOT NULL,
	"hour" smallint DEFAULT 9 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_preference_hour_range" CHECK ("push_preference"."hour" BETWEEN 0 AND 23)
);
--> statement-breakpoint
CREATE TABLE "push_subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscription_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
ALTER TABLE "push_dispatch" ADD CONSTRAINT "push_dispatch_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_preference" ADD CONSTRAINT "push_preference_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscription" ADD CONSTRAINT "push_subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "push_dispatch_sent_at_idx" ON "push_dispatch" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX "push_subscription_user_id_idx" ON "push_subscription" USING btree ("user_id");