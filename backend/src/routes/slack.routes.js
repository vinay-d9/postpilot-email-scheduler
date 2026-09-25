import crypto from "node:crypto";
import { Router } from "express";
import axios from "axios";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { requireAuth } from "../types/auth.js";

export const slackRouter = Router();

slackRouter.get("/status", requireAuth, async (req, res, next) => {
  try {
    const connection = await prisma.slackConnection.findUnique({ where: { userId: req.user.id } });
    res.json({ connected: Boolean(connection), teamName: connection?.teamName ?? null });
  } catch (error) { next(error); }
});

slackRouter.get("/connect", requireAuth, (req, res) => {
  if (!env.slackClientId || !env.slackClientSecret || !env.slackRedirectUri) {
    res.status(503).json({ error: "Slack OAuth is not configured" });
    return;
  }
  const state = crypto.randomBytes(24).toString("hex");
  req.session.slackOauthState = state;
  req.session.slackOauthUserId = req.user.id;
  const url = new URL("https://slack.com/oauth/v2/authorize");
  url.searchParams.set("client_id", env.slackClientId);
  url.searchParams.set("redirect_uri", env.slackRedirectUri);
  url.searchParams.set("scope", "chat:write,im:write");
  url.searchParams.set("state", state);
  res.redirect(url.toString());
});

slackRouter.get("/callback", async (req, res, next) => {
  try {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    const userId = req.session.slackOauthUserId;
    if (!code || !userId || state !== req.session.slackOauthState) {
      res.redirect(`${env.frontendUrl}/dashboard?slack=failed`);
      return;
    }
    const token = await axios.post("https://slack.com/api/oauth.v2.access", new URLSearchParams({
      code,
      client_id: env.slackClientId,
      client_secret: env.slackClientSecret,
      redirect_uri: env.slackRedirectUri
    }));
    if (!token.data.ok || !token.data.access_token) throw new Error(token.data.error ?? "Slack authorization failed");
    await prisma.slackConnection.upsert({
      where: { userId },
      update: { accessToken: token.data.access_token, teamId: token.data.team?.id, teamName: token.data.team?.name, scope: token.data.scope },
      create: { userId, accessToken: token.data.access_token, teamId: token.data.team?.id, teamName: token.data.team?.name, scope: token.data.scope }
    });
    delete req.session.slackOauthState;
    delete req.session.slackOauthUserId;
    res.redirect(`${env.frontendUrl}/dashboard?slack=connected`);
  } catch (error) { next(error); }
});

slackRouter.post("/disconnect", requireAuth, async (req, res, next) => {
  try {
    await prisma.slackConnection.deleteMany({ where: { userId: req.user.id } });
    res.status(204).send();
  } catch (error) { next(error); }
});
