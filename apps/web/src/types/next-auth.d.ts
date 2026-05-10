import type { DefaultSession } from "next-auth";
import type { UserRole, UserTier } from "@/lib/auth/types";

/**
 * Module augmentation for Auth.js v5 — extends the default `Session`,
 * `User` and `JWT` shapes with HotelVALORA-specific fields.
 *
 * The tier + role values are written onto the JWT in the `jwt` callback
 * (`auth.config.ts`) and mirrored onto the session in the `session`
 * callback — read them as `session.user.tier` everywhere.
 */
declare module "next-auth" {
  interface Session {
    user: {
      tier: UserTier;
      role: UserRole;
    } & DefaultSession["user"];
  }

  interface User {
    tier?: UserTier;
    role?: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    tier?: UserTier;
    role?: UserRole;
    /** OAuth provider that minted this session (google / linkedin / apple) */
    provider?: string;
  }
}
