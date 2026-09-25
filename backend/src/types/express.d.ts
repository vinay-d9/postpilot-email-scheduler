declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      name: string;
      avatar: string | null;
    }
  }
}

declare module "express-session" {
  interface SessionData {
    slackOauthState?: string;
    slackOauthUserId?: string;
  }
}

export {};
