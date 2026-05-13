function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}
function opt(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const env = {
  databaseUrl: () => req("DATABASE_URL"),
  dashboardPassword: () => req("DASHBOARD_PASSWORD"),
  sessionSecret: () => req("SESSION_SECRET"),
  cronSecret: () => req("CRON_SECRET"),

  publicBaseUrl: () => opt("PUBLIC_BASE_URL", "http://localhost:3000").replace(/\/$/, ""),

  slack: {
    clientId: () => req("SLACK_CLIENT_ID"),
    clientSecret: () => req("SLACK_CLIENT_SECRET"),
    signingSecret: () => opt("SLACK_SIGNING_SECRET", ""),
    excludeChannels: () =>
      opt("SLACK_EXCLUDE_CHANNELS", "jobs,hiring,classifieds,off-topic,random,memes")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
  },

  anthropic: {
    apiKey: () => req("ANTHROPIC_API_KEY"),
  },
};
