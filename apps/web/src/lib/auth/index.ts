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

// User session store (v1 mock → v2 NextAuth swap)
export { useAuthStore, useAuth } from "./store";

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
