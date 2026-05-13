import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
  serial,
  real,
} from "drizzle-orm/pg-core";

export const messageStatus = pgEnum("message_status", ["pending", "sent", "skipped"]);

// One row per Slack workspace OAuth install. The xoxp- user token here is what
// lets the scanner read history for channels Deniz has joined as himself.
export const slackWorkspaces = pgTable(
  "slack_workspaces",
  {
    id: serial("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(), // T01ABC...
    workspaceName: text("workspace_name").notNull(),
    userToken: text("user_token").notNull(), // xoxp-...
    slackUserId: text("slack_user_id").notNull(), // U... — Deniz's user id in this workspace
    slackUserName: text("slack_user_name"),
    installedAt: timestamp("installed_at", { withTimezone: true }).notNull().defaultNow(),
    lastScanAt: timestamp("last_scan_at", { withTimezone: true }),
    active: boolean("active").notNull().default(true),
  },
  (t) => ({
    uniqWs: uniqueIndex("uniq_workspace_id").on(t.workspaceId),
  }),
);

export const flaggedMessages = pgTable(
  "flagged_messages",
  {
    id: serial("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    workspaceName: text("workspace_name").notNull(),
    channelId: text("channel_id").notNull(),
    channelName: text("channel_name").notNull(),
    messageTs: text("message_ts").notNull(), // Slack message timestamp, also acts as message id
    threadTs: text("thread_ts"), // null = top-level message
    permalink: text("permalink"),
    authorUserId: text("author_user_id").notNull(),
    authorDisplayName: text("author_display_name"),
    authorAvatarUrl: text("author_avatar_url"),
    messageText: text("message_text").notNull(),
    contextJson: jsonb("context_json").$type<Array<{ user: string; text: string; ts: string }>>().notNull().default([]),
    matchedKeywords: jsonb("matched_keywords").$type<string[]>().notNull().default([]),
    relevanceScore: real("relevance_score"), // 0-10 from Haiku
    relevanceReasoning: text("relevance_reasoning"),
    draftResponse: text("draft_response").notNull(),
    status: messageStatus("status").notNull().default("pending"),
    flaggedAt: timestamp("flagged_at", { withTimezone: true }).notNull().defaultNow(),
    actionedAt: timestamp("actioned_at", { withTimezone: true }),
  },
  (t) => ({
    uniqMsg: uniqueIndex("uniq_workspace_channel_ts").on(t.workspaceId, t.channelId, t.messageTs),
    statusIdx: index("idx_flagged_status").on(t.status),
    flaggedAtIdx: index("idx_flagged_at").on(t.flaggedAt),
  }),
);

export const sentResponses = pgTable("sent_responses", {
  id: serial("id").primaryKey(),
  flaggedMessageId: integer("flagged_message_id")
    .notNull()
    .references(() => flaggedMessages.id, { onDelete: "cascade" }),
  finalText: text("final_text").notNull(), // what Deniz actually sent (may differ from draft)
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
});

export const monitoredThreads = pgTable(
  "monitored_threads",
  {
    id: serial("id").primaryKey(),
    flaggedMessageId: integer("flagged_message_id")
      .notNull()
      .references(() => flaggedMessages.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id").notNull(),
    channelId: text("channel_id").notNull(),
    threadTs: text("thread_ts").notNull(), // the parent message ts (Deniz replied in this thread)
    lastSeenReplyTs: text("last_seen_reply_ts"), // most recent reply ts we've processed
    lastReplyText: text("last_reply_text"),
    lastReplyUser: text("last_reply_user"),
    hasUnseenReply: boolean("has_unseen_reply").notNull().default(false),
    permalink: text("permalink"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }).notNull().defaultNow(),
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
  },
  (t) => ({
    uniqThread: uniqueIndex("uniq_thread").on(t.workspaceId, t.channelId, t.threadTs),
    unseenIdx: index("idx_unseen_replies").on(t.hasUnseenReply),
  }),
);

export const scanRuns = pgTable("scan_runs", {
  id: serial("id").primaryKey(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  workspacesScanned: integer("workspaces_scanned").notNull().default(0),
  channelsScanned: integer("channels_scanned").notNull().default(0),
  messagesSeen: integer("messages_seen").notNull().default(0),
  messagesFlagged: integer("messages_flagged").notNull().default(0),
  errors: jsonb("errors").$type<unknown[]>().notNull().default([]),
});

export type SlackWorkspace = typeof slackWorkspaces.$inferSelect;
export type NewSlackWorkspace = typeof slackWorkspaces.$inferInsert;
export type FlaggedMessage = typeof flaggedMessages.$inferSelect;
export type NewFlaggedMessage = typeof flaggedMessages.$inferInsert;
export type SentResponse = typeof sentResponses.$inferSelect;
export type MonitoredThread = typeof monitoredThreads.$inferSelect;
export type ScanRun = typeof scanRuns.$inferSelect;
