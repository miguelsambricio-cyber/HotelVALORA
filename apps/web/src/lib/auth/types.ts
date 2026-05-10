// Auth contracts — canonical types used across the app.
//
// `UserTier` is the institutional tier vocabulary:
//
//   free          → public landing only; cannot view financials
//   pro           → can view financial pages, all assumption inputs render readonly
//   premium       → can edit assumptions, full underwriting access
//   team          → premium + multi-seat workspace (planned, Phase 5)
//   enterprise    → bulk export, API access, SSO, audit — institutional partners
//                   (planned, Phase 5)
//
// `OAuthProvider` enumerates the social/identity providers the platform
// surfaces to users. The matching `OAuthProviderConfig` registry lives in
// `./providers` and maps each id to Auth.js's expected shape.
//
// Auth.js v5 session/JWT augmentation lives in `src/types/next-auth.d.ts`
// — it imports `UserTier` from this file so the two surfaces stay in sync.

// ── User / session ─────────────────────────────────────────────────────────

export type UserTier =
  | "free"
  | "pro"
  | "premium"
  | "team"
  | "enterprise";

export type UserRole = "user" | "admin" | "owner";

export interface User {
  id: string;
  email: string;
  name: string;
  tier: UserTier;
  role?: UserRole;
  /** Organisation name — present when tier=team or tier=enterprise */
  organization?: string;
}

export interface AuthSession {
  user: User | null;
  isAuthenticated: boolean;
}

export interface SignInResult {
  ok: boolean;
  error?: string;
}

// ── OAuth provider (canonical home — UI components import from here) ──────

export type OAuthProvider = "linkedin" | "google" | "apple" | "microsoft";

export type LinkedAccountState = "connected" | "available";

export interface LinkedAccount {
  provider: OAuthProvider;
  name: string;
  state: LinkedAccountState;
  /** Email shown when state is "connected" — small caption under the name */
  linkedEmail?: string;
}
