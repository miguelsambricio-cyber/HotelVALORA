// OAuth provider registry — single source of truth for which identity
// providers the platform supports. Shaped to map 1:1 onto NextAuth's
// `authOptions.providers[]` entries when we wire the real OAuth flow.
//
// v1 (mock UI only)
// ─────────────────
// Every provider has `enabled: false`. The UI still renders the cards and
// captures click intent (via `useOAuth().signInWithProvider`) but the hook
// body is a no-op — clicks land in `console.warn`, no redirect happens.
//
// v2 (NextAuth wire-up — single PR)
// ─────────────────────────────────
// 1. `pnpm add next-auth` in apps/web
// 2. Set `enabled: true` on the providers we ship first (likely Google +
//    LinkedIn before Apple — Apple requires Apple Developer + Services ID
//    setup which is heavier).
// 3. Add `app/api/auth/[...nextauth]/route.ts` with `authOptions` that
//    iterates this registry's enabled entries:
//
//      providers: getEnabledOAuthProviders().map((p) => {
//        switch (p.id) {
//          case "google":   return GoogleProvider({ clientId, clientSecret, authorization: { params: { scope: p.scopes.join(" ") } } });
//          case "linkedin": return LinkedInProvider({ ... });
//          case "apple":    return AppleProvider({ ... });
//        }
//      }),
//
// 4. Wrap the app in `<SessionProvider>` (likely in `app/layout.tsx`'s
//    Providers).
// 5. Replace `useOAuth().signInWithProvider` body with
//    `signIn(OAUTH_PROVIDERS[id].nextAuthId)`. UI components don't change.
// 6. Wire user.tier from the JWT claim or DB row in NextAuth callbacks.
//
// Until step 2 ships, the cards stay placeholder — explicit by design.

import type { OAuthProvider } from "./types";

export interface OAuthProviderConfig {
  id: OAuthProvider;
  /** Human-readable label for the UI */
  label: string;
  /**
   * NextAuth provider id — drives `signIn(nextAuthId)` when the real flow
   * is wired. Same as the npm package's provider key.
   */
  nextAuthId: string;
  /**
   * OAuth scopes requested at sign-in. Map directly to NextAuth's
   * `authorization.params.scope` (space-joined).
   */
  scopes: readonly string[];
  /** Brand colour hex — surfaces in the UI mark / accent */
  brandColor: string;
  /**
   * v1: `false` everywhere — UI is mock. Set to `true` per-provider when
   * the corresponding NextAuth provider is configured (env vars set,
   * developer-portal app created, redirect URIs whitelisted).
   */
  enabled: boolean;
}

export const OAUTH_PROVIDERS: Record<OAuthProvider, OAuthProviderConfig> = {
  linkedin: {
    id: "linkedin",
    label: "LinkedIn",
    nextAuthId: "linkedin",
    // OpenID Connect scope set — works with NextAuth's LinkedInProvider
    scopes: ["openid", "profile", "email"],
    brandColor: "#0A66C2",
    enabled: false,
  },
  google: {
    id: "google",
    label: "Google",
    nextAuthId: "google",
    scopes: ["openid", "profile", "email"],
    brandColor: "#4285F4",
    enabled: false,
  },
  apple: {
    id: "apple",
    label: "Apple",
    nextAuthId: "apple",
    // Apple Sign In requires `name` + `email` — populated only on first
    // sign-in by Apple's flow; subsequent sessions read from DB.
    scopes: ["name", "email"],
    brandColor: "#000000",
    enabled: false,
  },
  microsoft: {
    id: "microsoft",
    label: "Microsoft Azure",
    // Maps to NextAuth's AzureAD / EntraID provider when wired —
    // surfaces enterprise SSO + Active Directory sync.
    nextAuthId: "azure-ad",
    scopes: ["openid", "profile", "email"],
    brandColor: "#0078D4",
    enabled: false,
  },
};

/** Look up a provider's config — useful for UI decoration (brand colour, label). */
export function getOAuthProvider(id: OAuthProvider): OAuthProviderConfig {
  return OAUTH_PROVIDERS[id];
}

/**
 * Returns the providers that are currently wired to a real OAuth backend.
 * Use this to hide / disable cards for providers that aren't configured
 * yet without hard-coding the list at every consumer.
 */
export function getEnabledOAuthProviders(): OAuthProviderConfig[] {
  return Object.values(OAUTH_PROVIDERS).filter((p) => p.enabled);
}
