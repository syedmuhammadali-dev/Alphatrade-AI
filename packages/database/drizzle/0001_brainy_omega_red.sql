CREATE TYPE "public"."risk_decision" AS ENUM('APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "risk_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"symbol" text NOT NULL,
	"proposal_id" text NOT NULL,
	"decision" "risk_decision" NOT NULL,
	"reasons" jsonb NOT NULL,
	"position_size_units" real,
	"position_size_notional_usd" real,
	"risk_config_snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "risk_checks" ADD CONSTRAINT "risk_checks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
