import "dotenv/config";

function numberEnv(name, fallback) {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${name} must be a number`);
  return parsed;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: numberEnv("PORT", 5000),
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",
  sessionSecret: process.env.SESSION_SECRET ?? "development-only-change-me",
  databaseUrl: process.env.DATABASE_URL,
  redisHost: process.env.REDIS_HOST ?? "localhost",
  redisPort: numberEnv("REDIS_PORT", 6379),
  workerConcurrency: numberEnv("WORKER_CONCURRENCY", 5),
  minEmailDelayMs: numberEnv("MIN_EMAIL_DELAY_MS", 2000),
  maxEmailsPerHour: numberEnv("MAX_EMAILS_PER_HOUR", 200),
  etherealHost: process.env.ETHEREAL_HOST,
  etherealPort: numberEnv("ETHEREAL_PORT", 587),
  etherealUser: process.env.ETHEREAL_USER,
  etherealPassword: process.env.ETHEREAL_PASSWORD,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL,
  slackClientId: process.env.SLACK_CLIENT_ID,
  slackClientSecret: process.env.SLACK_CLIENT_SECRET,
  slackRedirectUri: process.env.SLACK_REDIRECT_URI,
  elasticsearchUrl: process.env.ELASTICSEARCH_URL
};

const redisUrl = process.env.REDIS_URL;

export const redisConnection = redisUrl
  ? (() => {
      const url = new URL(redisUrl);

      return {
        host: url.hostname,
        port: Number(url.port || 6379),
        username: url.username || undefined,
        password: url.password || undefined,
        family: 0
      };
    })()
  : {
      host: env.redisHost,
      port: env.redisPort,
      family: 0
    };
