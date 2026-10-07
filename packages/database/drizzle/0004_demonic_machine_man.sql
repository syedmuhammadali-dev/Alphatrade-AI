CREATE TYPE "public"."exchange" AS ENUM('BINANCE');--> statement-breakpoint
CREATE TYPE "public"."live_close_reason" AS ENUM('TAKE_PROFIT', 'STOP_LOSS', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."live_position_status" AS ENUM('OPEN', 'CLOSED');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "exchange_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"exchange" "exchange" DEFAULT 'BINANCE' NOT NULL,
	"label" text NOT NULL,
	"encrypted_api_key" text NOT NULL,
	"encrypted_api_secret" text NOT NULL,
	"api_key_last4" text NOT NULL,
	"testnet" boolean DEFAULT true NOT NULL,
	"can_trade" boolean,
	"last_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "live_positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"symbol" text NOT NULL,
	"side" text DEFAULT 'LONG' NOT NULL,
	"strategy" text NOT NULL,
	"entry_price" real NOT NULL,
	"quantity" real NOT NULL,
	"stop_loss" real NOT NULL,
	"take_profit" real NOT NULL,
	"entry_order_id" text NOT NULL,
	"status" "live_position_status" DEFAULT 'OPEN' NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"close_price" real,
	"close_reason" "live_close_reason",
	"exit_order_id" text,
	"realized_pnl_usd" real
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "exchange_connections" ADD CONSTRAINT "exchange_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "live_positions" ADD CONSTRAINT "live_positions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "live_positions" ADD CONSTRAINT "live_positions_connection_id_exchange_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."exchange_connections"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
