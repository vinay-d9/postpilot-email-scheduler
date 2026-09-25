import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { redis } from "./config/redis.js";
import { reconcileScheduledJobs } from "./services/email.service.js";

async function start() {
  try {
    await prisma.$connect();
    console.info("✓ Database connected");
    
    await redis.ping();
    console.info("✓ Redis connected");
    
    const repaired = await reconcileScheduledJobs();
    console.info(`✓ Job reconciliation complete (${repaired} missing jobs restored)`);
    
    app.listen(env.port, () => {
      console.info(`\n✓ API listening on http://localhost:${env.port}`);
      console.info(`✓ Bull Board available at http://localhost:${env.port}/admin/queues\n`);
    });
  } catch (error) {
    console.error("Failed to start API:", error);
    await prisma.$disconnect();
    await redis.quit();
    process.exit(1);
  }
}

start();

process.on("SIGINT", async () => {
  console.info("\nShutting down...");
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});
