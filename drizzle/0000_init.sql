CREATE TYPE "public"."message_status" AS ENUM('pending', 'sent', 'skipped');--> statement-breakpoint
CREATE TABLE "flagged_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"workspace_name" text NOT NULL,
	"channel_id" text NOT NULL,
	"channel_name" text NOT NULL,
	"message_ts" text NOT NULL,
	"thread_ts" text,
	"permalink" text,
	"author_user_id" text NOT NULL,
	"author_display_name" text,
	"author_avatar_url" text,
	"message_text" text NOT NULL,
	"context_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"matched_keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"relevance_score" real,
	"relevance_reasoning" text,
	"draft_response" text NOT NULL,
	"status" "message_status" DEFAULT 'pending' NOT NULL,
	"flagged_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actioned_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "monitored_threads" (
	"id" serial PRIMARY KEY NOT NULL,
	"flagged_message_id" integer NOT NULL,
	"workspace_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"thread_ts" text NOT NULL,
	"last_seen_reply_ts" text,
	"last_reply_text" text,
	"last_reply_user" text,
	"has_unseen_reply" boolean DEFAULT false NOT NULL,
	"permalink" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dismissed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "scan_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"workspaces_scanned" integer DEFAULT 0 NOT NULL,
	"channels_scanned" integer DEFAULT 0 NOT NULL,
	"messages_seen" integer DEFAULT 0 NOT NULL,
	"messages_flagged" integer DEFAULT 0 NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sent_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"flagged_message_id" integer NOT NULL,
	"final_text" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "slack_workspaces" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"workspace_name" text NOT NULL,
	"user_token" text NOT NULL,
	"slack_user_id" text NOT NULL,
	"slack_user_name" text,
	"installed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_scan_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "monitored_threads" ADD CONSTRAINT "monitored_threads_flagged_message_id_flagged_messages_id_fk" FOREIGN KEY ("flagged_message_id") REFERENCES "public"."flagged_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sent_responses" ADD CONSTRAINT "sent_responses_flagged_message_id_flagged_messages_id_fk" FOREIGN KEY ("flagged_message_id") REFERENCES "public"."flagged_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_workspace_channel_ts" ON "flagged_messages" USING btree ("workspace_id","channel_id","message_ts");--> statement-breakpoint
CREATE INDEX "idx_flagged_status" ON "flagged_messages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_flagged_at" ON "flagged_messages" USING btree ("flagged_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_thread" ON "monitored_threads" USING btree ("workspace_id","channel_id","thread_ts");--> statement-breakpoint
CREATE INDEX "idx_unseen_replies" ON "monitored_threads" USING btree ("has_unseen_reply");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_workspace_id" ON "slack_workspaces" USING btree ("workspace_id");