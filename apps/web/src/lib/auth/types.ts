// Auth contracts — canonical types used across the app.
//
// `UserTier` is the institutional tier vocabulary:
//
//   free          → public landing only; cannot view financials
//   pro           → can view financial pages, all assumption inputs render readonly
//   premium       → can edit assumptions, full underwriting access
//   institutional → premium + organisational features (multi-asset, bulk export,
//                   API access — future). Treated as premium for v1 gating.
//
// `OAuthProvider` enumerates the social/identity providers the platform
// surfaces to users. The matching `OAuthProviderConfig` registry lives in
// `./providers` and maps each id to NextAuth's expected shape — when the
// real OAuth wires through, only that registry needs `enabled: true` plus
// the matching `<Provider />` entry in NextAuth's `authOptions`.

// ── User / session ─────────────────────────────────────────────────────────

export type UserTier = "free" | "pro" | "premium" | "institutional";

export interface User {
  id: string;
  email: string;
  name: string;
  tier: UserTier;
  /** Organisation name (institutional only — present when tier=institutional) */
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

export type OAuthProvider = "linkedin" | "google" | "apple";

export type LinkedAccountState = "connected" | "available";

export interface LinkedAccount {
  provider: OAuthProvider;
  name: string;
  state: LinkedAccountState;
  /** Email shown when state is "connected" — small caption under the name */
  linkedEmail?: string;
}
