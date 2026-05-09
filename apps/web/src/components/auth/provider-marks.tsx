import type { ReactNode } from "react";
import { Linkedin } from "lucide-react";
import { OAUTH_PROVIDERS, type OAuthProvider } from "@/lib/auth";

// Centralised provider mark catalogue — used by both the login page's
// LinkedInstitutionalAccounts row and the settings credentials page's
// LinkedAccountCard grid. Single source of truth for how each identity
// provider renders its icon.
//
// Visual rules:
//   - LinkedIn → lucide stroke icon (brand colour from registry)
//   - Google / Apple / Microsoft → minimal monochrome inline SVGs
//     (public-domain wordmark silhouettes, stripped of multi-colour
//     decoration so they read enterprise-neutral)

export const PROVIDER_MARKS: Record<OAuthProvider, ReactNode> = {
  linkedin: (
    <Linkedin
      size={18}
      style={{ color: OAUTH_PROVIDERS.linkedin.brandColor }}
      strokeWidth={2}
    />
  ),
  google: <GoogleMark />,
  apple: <AppleMark />,
  microsoft: <MicrosoftMark />,
};

function GoogleMark() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="text-slate-700"
      aria-hidden
    >
      <path d="M21.35 11.1H12v3.83h5.59c-.51 2.45-2.6 4.07-5.59 4.07-3.36 0-6.06-2.71-6.06-6.06s2.71-6.06 6.06-6.06c1.5 0 2.85.51 3.92 1.36l2.83-2.83C16.92 3.97 14.6 3 12 3 7.04 3 3 7.04 3 12s4.04 9 9 9c5.18 0 8.83-3.65 8.83-8.83 0-.59-.05-1.16-.15-1.71z" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="text-slate-800"
      aria-hidden
    >
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

function MicrosoftMark() {
  // Classic 4-tile Windows mark, rendered monochrome (slate) for
  // enterprise neutrality. The two right tiles inherit a slightly
  // darker slate so the four-quadrant identity stays readable without
  // the brand red/green/blue/yellow.
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <rect x="2" y="2" width="9" height="9" className="fill-slate-500" />
      <rect x="13" y="2" width="9" height="9" className="fill-slate-700" />
      <rect x="2" y="13" width="9" height="9" className="fill-slate-700" />
      <rect x="13" y="13" width="9" height="9" className="fill-slate-500" />
    </svg>
  );
}
