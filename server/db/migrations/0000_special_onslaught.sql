CREATE TABLE "assessment_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"bank_version" integer NOT NULL,
	"refs" jsonb NOT NULL,
	"result" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "family_solves" (
	"player_id" uuid NOT NULL,
	"family_id" varchar(80) NOT NULL,
	CONSTRAINT "family_solves_player_id_family_id_pk" PRIMARY KEY("player_id","family_id")
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alias" varchar(20) NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "players_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "practice_attempts" (
	"player_id" uuid NOT NULL,
	"variant" varchar(64) NOT NULL,
	"day" date NOT NULL,
	"wrong" integer DEFAULT 0 NOT NULL,
	"assisted" boolean DEFAULT false NOT NULL,
	"solved" boolean DEFAULT false NOT NULL,
	CONSTRAINT "practice_attempts_player_id_variant_day_pk" PRIMARY KEY("player_id","variant","day")
);
--> statement-breakpoint
CREATE TABLE "api_quotas" (
	"key" varchar(160) PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "xp_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"variant" varchar(64) NOT NULL,
	"day" date NOT NULL,
	"week" date NOT NULL,
	"xp" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bounded_xp" CHECK ("xp_events"."xp" >= 0 and "xp_events"."xp" <= 20)
);
--> statement-breakpoint
ALTER TABLE "assessment_runs" ADD CONSTRAINT "assessment_runs_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_solves" ADD CONSTRAINT "family_solves_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_attempts" ADD CONSTRAINT "practice_attempts_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assessment_latest_player" ON "assessment_runs" USING btree ("player_id","completed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "xp_once_per_variant_day" ON "xp_events" USING btree ("player_id","variant","day");--> statement-breakpoint
CREATE INDEX "xp_by_week_player" ON "xp_events" USING btree ("week","player_id");