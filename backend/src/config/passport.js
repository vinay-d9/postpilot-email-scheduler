import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { env } from "./env.js";
import { prisma } from "./prisma.js";

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user ? { id: user.id, email: user.email, name: user.name, avatar: user.avatar } : false);
  } catch (error) {
    done(error);
  }
});

if (env.googleClientId && env.googleClientSecret && env.googleCallbackUrl) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.googleClientId,
        clientSecret: env.googleClientSecret,
        callbackURL: env.googleCallbackUrl,
        passReqToCallback: false,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          if (!email) return done(new Error("Google did not provide an email address"));
          const user = await prisma.user.upsert({
            where: { googleId: profile.id },
            update: { name: profile.displayName, email, avatar: profile.photos?.[0]?.value },
            create: { googleId: profile.id, name: profile.displayName || email, email, avatar: profile.photos?.[0]?.value }
          });
          done(null, { id: user.id, email: user.email, name: user.name, avatar: user.avatar });
        } catch (error) {
          done(error);
        }
      }
    )
  );
}

export { passport };
