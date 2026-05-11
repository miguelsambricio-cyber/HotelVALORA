// Auth — public surface.

// Types
export type {
  UserTier,
  User,
  AuthSession,
  SignInResult,
  OAuthProvider,
  LinkedAccount,
  LinkedAccountState,
} from "./types";

// User session store
// `useAuthStore`  → raw Zustand mock (legacy direct access).
// `useMockAuth`   → typed selector over the mock; used as the fallback
//                   branch of `useAuth` when AUTH_ENABLED=false.
// `useAuth`       → unified hook. Picks Supabase Auth or the mock at
//                   build time via NEXT_PUBLIC_AUTH_ENABLED. THIS is
//                   what every UI surface imports.
export { useAuthStore, useMockAuth } from "./store";
export { useAuth } from "./use-auth";
export type { UseAuthResult } from "./use-auth";

// Build-time flag helpers (server + client).
export {
  isAuthEnabledServer,
  isAuthEnabledClient,
  isSupabaseAuthConfigured,
} from "./auth-mode";

// OAuth provider registry (NextAuth-shaped)
export type { OAuthProviderConfig } from "./providers";
export {
  OAUTH_PROVIDERS,
  getOAuthProvider,
  getEnabledOAuthProviders,
} from "./providers";

// OAuth interaction hook (v1 no-op body, NextAuth-ready interface)
export type { OAuthSignInResult } from "./use-oauth";
export { useOAuth } from "./use-oauth";
