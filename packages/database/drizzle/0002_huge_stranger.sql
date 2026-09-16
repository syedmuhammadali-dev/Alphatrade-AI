CREATE TYPE "public"."paper_close_reason" AS ENUM('TAKE_PROFIT', 'STOP_LOSS', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."paper_position_side" AS ENUM('LONG', 'SHORT');--> statement-breakpoint
CREATE TYPE "public"."paper_position_status" AS ENUM('OPEN', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."paper_order_type" AS ENUM('ENTRY', 'EXIT');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "paper_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"balance_usd" real NOT NULL,
	"starting_balance_usd" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "paper_accounts_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "paper_positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"symbol" text NOT NULL,
	"side" "paper_position_side" NOT NULL,
	"strategy" text NOT NULL,
	"entry_price" real NOT NULL,
	"quantity" real NOT NULL,
	"stop_loss" real NOT NULL,
	"take_profit" real NOT NULL,
	"entry_fee_usd" real NOT NULL,
	"status" "paper_position_status" DEFAULT 'OPEN' NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"close_price" real,
	"close_reason" "paper_close_reason",
	"exit_fee_usd" real,
	"realized_pnl_usd" real
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "paper_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"position_id" uuid NOT NULL,
	"symbol" text NOT NULL,
	"type" "paper_order_type" NOT NULL,
	"quantity" real NOT NULL,
	"price" real NOT NULL,
	"fee_usd" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "paper_accounts" ADD CONSTRAINT "paper_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "paper_positions" ADD CONSTRAINT "paper_positions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "paper_orders" ADD CONSTRAINT "paper_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "paper_orders" ADD CONSTRAINT "paper_orders_position_id_paper_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."paper_positions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
