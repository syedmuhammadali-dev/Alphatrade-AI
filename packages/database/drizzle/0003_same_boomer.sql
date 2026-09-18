CREATE TYPE "public"."backtest_status" AS ENUM('COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "backtest_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"backtest_id" uuid NOT NULL,
	"initial_balance_usd" real NOT NULL,
	"final_balance_usd" real NOT NULL,
	"total_return_percent" real NOT NULL,
	"trade_count" integer NOT NULL,
	"wins" integer NOT NULL,
	"losses" integer NOT NULL,
	"win_rate" real,
	"profit_factor" real,
	"sharpe_ratio" real,
	"max_drawdown_percent" real NOT NULL,
	"average_risk_reward" real,
	"trades" jsonb NOT NULL,
	CONSTRAINT "backtest_results_backtest_id_unique" UNIQUE("backtest_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "backtests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"symbol" text NOT NULL,
	"interval" text NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"request" jsonb NOT NULL,
	"status" "backtest_status" NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "backtest_results" ADD CONSTRAINT "backtest_results_backtest_id_backtests_id_fk" FOREIGN KEY ("backtest_id") REFERENCES "public"."backtests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "backtests" ADD CONSTRAINT "backtests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
