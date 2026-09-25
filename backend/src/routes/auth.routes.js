import { Router } from "express";
import { env } from "../config/env.js";
import { passport } from "../config/passport.js";
import { requireAuth } from "../types/auth.js";

export const authRouter = Router();

authRouter.get("/google", (req, res, next) => {
  if (!env.googleClientId || !env.googleClientSecret || !env.googleCallbackUrl) {
    res.status(503).json({ error: "Google OAuth is not configured" });
    return;
  }
  passport.authenticate("google", { scope: ["profile", "email"], prompt: "select_account", })(req, res, next);
});

authRouter.get("/google/callback", (req, res, next) => {
  passport.authenticate("google", { failureRedirect: `${env.frontendUrl}/?auth=failed` })(req, res, (error) => {
    if (error) return next(error);
    res.redirect(`${env.frontendUrl}/dashboard`);
  });
});

authRouter.get("/me", requireAuth, (req, res) => res.json({ user: req.user }));

authRouter.post("/logout", requireAuth, (req, res, next) => {
  req.logout((error) => {
    if (error) return next(error);
    req.session.destroy(() => res.clearCookie("email_scheduler_session").status(204).send());
  });
});
