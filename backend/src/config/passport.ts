import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { env } from "./env.js";
import { prisma } from "./prisma.js";

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id: string, done) => {
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
        callbackURL: env.googleCallbackUrl
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          if (!email) return done(new Error("Google did not provide an email address"));
          const user = await prisma.user.upsert({
            where: { googleId: profile.id },
            update: { name: profile.displayName, email, avatar: profile.photos?.[0]?.value },
            create: { googleId: profile.id, name: profile.displayName, email, avatar: profile.photos?.[0]?.value }
          });
          await prisma.sender.upsert({
            where: { userId_email: { userId: user.id, email } },
            update: { displayName: user.name },
            create: { userId: user.id, email, displayName: user.name }
          });
          return done(null, { id: user.id, email: user.email, name: user.name, avatar: user.avatar });
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );
}

export { passport };
