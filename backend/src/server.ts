import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { redis } from "./config/redis.js";
import { reconcileScheduledJobs } from "./services/email.service.js";

async function start() {
  await prisma.$connect();
  await redis.ping();
  const repaired = await reconcileScheduledJobs();
  app.listen(env.port, () => {
    console.info(`API listening on http://localhost:${env.port} (${repaired} missing jobs reconciled)`);
  });
}

start().catch(async (error) => {
  console.error("Could not start API", error);
  await prisma.$disconnect();
  await redis.quit();
  process.exit(1);
});
