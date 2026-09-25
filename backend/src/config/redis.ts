import { Redis } from "ioredis";
import { redisConnection } from "./env.js";

export const redis = new Redis({ ...redisConnection,  family: 0, maxRetriesPerRequest: null });
