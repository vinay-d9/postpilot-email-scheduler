import { EmailStatus } from "@prisma/client";
import { Router } from "express";
import { ZodError } from "zod";
import { scheduleCampaign, scheduleSchema, listEmails, listSentEmails } from "../services/email.service.js";
import { searchEmails } from "../services/elasticsearch.service.js";
import { requireAuth } from "../types/auth.js";

export const emailRouter = Router();
emailRouter.use(requireAuth);

emailRouter.post("/schedule", async (req, res, next) => {
  try {
    const result = await scheduleCampaign(req.user!.id, scheduleSchema.parse(req.body));
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: "Invalid scheduling request", details: error.flatten() });
      return;
    }
    if (error instanceof Error && error.message.includes("sender")) {
      res.status(400).json({ error: error.message });
      return;
    }
    next(error);
  }
});

emailRouter.get("/scheduled", async (req, res, next) => {
  try { res.json({ emails: await listEmails(req.user!.id, EmailStatus.SCHEDULED) }); }
  catch (error) { next(error); }
});

emailRouter.get("/sent", async (req, res, next) => {
  try { res.json({ emails: await listSentEmails(req.user!.id) }); }
  catch (error) { next(error); }
});

emailRouter.get("/search", async (req, res, next) => {
  try {
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
    res.json({ emails: await searchEmails(req.user!.id, query) });
  } catch (error) {
    if (error instanceof Error && error.message === "Elasticsearch is not configured") {
      res.status(503).json({ error: error.message });
      return;
    }
    next(error);
  }
});
