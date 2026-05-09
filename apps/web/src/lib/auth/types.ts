// Auth contract — institutional tier vocabulary used across the app.
//
// `UserTier` is the canonical enum:
//
//   free          → public landing only; cannot view financials
//   pro           → can view financial pages, all assumption inputs render readonly
//   premium       → can edit assumptions, full underwriting access
//   institutional → premium + organisational features (multi-asset, bulk export,
//                   API access — future). Treated as premium for v1 gating.
//
// Compatible with the existing financial gating (`Tier` in
// `@/lib/report/financials` re-exports `UserTier`). Future Supabase/Clerk
// integration will populate the `User.tier` field from a JWT claim or
// org-membership table; the UI never has to change.

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
