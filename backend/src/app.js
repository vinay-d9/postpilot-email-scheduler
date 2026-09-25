import express from "express";
import cors from "cors";
import session from "express-session";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { env } from "./config/env.js";
import { passport } from "./config/passport.js";
import { redis } from "./config/redis.js";
import { prisma } from "./config/prisma.js";
import { emailQueue } from "./queues/email.queue.js";
import { authRouter } from "./routes/auth.routes.js";
import { emailRouter } from "./routes/email.routes.js";
import { slackRouter } from "./routes/slack.routes.js";
import { requireAuth } from "./types/auth.js";

export const app = express();
app.set("trust proxy", 1);
app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(session({
  name: "email_scheduler_session",
  secret: env.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: env.nodeEnv === "production", maxAge: 7 * 24 * 60 * 60 * 1000 }
}));
app.use(passport.initialize());
app.use(passport.session());

app.get("/api/health", async (_req, res) => {
  const checks = await Promise.allSettled([
    prisma.$queryRaw`SELECT 1`,
    redis.ping()
  ]);
  const healthy = checks.every((check) => check.status === "fulfilled");
  res.status(healthy ? 200 : 503).json({
    ok: healthy,
    database: checks[0].status === "fulfilled" ? "up" : "down",
    redis: checks[1].status === "fulfilled" ? "up" : "down"
  });
});

app.use("/api/auth", authRouter);
app.use("/api/emails", emailRouter);
app.use("/api/slack", slackRouter);

const boardAdapter = new ExpressAdapter();
boardAdapter.setBasePath("/admin/queues");
createBullBoard({ queues: [new BullMQAdapter(emailQueue)], serverAdapter: boardAdapter });
app.use("/admin/queues", boardAdapter.getRouter());

const errorHandler = (err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
};
app.use(errorHandler);

export default app;
