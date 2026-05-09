"use client";

// Profile state — Zustand store with mock initial values.
//
// v1 (today)
// ──────────
// In-memory state. The form mutates it locally; the "Continue" CTA fires
// `commitProfile` which is a no-op + console.info today (any persistence
// layer plugs in here later).
//
// v2 (backend wired)
// ──────────────────
// Replace `commitProfile` body with `await api.put("/api/v1/me/profile",
// state.profile)`. UI doesn't change. Hydrate `profile` on mount from
// `GET /api/v1/me/profile`.
//
// Profile completion is computed live from the current values — counts
// filled required fields against the required-field roster. The widget
// re-renders automatically when any field changes.

import { create } from "zustand";
import { DEFAULT_COUNTRY_CODE } from "./countries";
import type { UserProfile, UserAddress, UserConsents, UserRole } from "./types";

const REQUIRED_FIELDS: Array<keyof UserProfile> = [
  "firstName",
  "lastName",
  "email",
  "company",
  "position",
  "role",
];

const REQUIRED_ADDRESS_FIELDS: Array<keyof UserAddress> = [
  "street",
  "city",
  "countryCode",
  "phone",
];

interface ProfileState {
  profile: UserProfile;
  setField: <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => void;
  setAddressField: <K extends keyof UserAddress>(key: K, value: UserAddress[K]) => void;
  setConsent: <K extends keyof UserConsents>(key: K, value: UserConsents[K]) => void;
  /** Hydrate locked email from the auth provider on mount */
  hydrateEmail: (email: string) => void;
  /** Future: PUT /api/v1/me/profile. v1 = no-op + console.info */
  commitProfile: () => Promise<{ ok: boolean; error?: string }>;
}

const INITIAL_PROFILE: UserProfile = {
  firstName: "Miguel",
  middleName: "",
  lastName: "Sambricio",
  email: "miguel@valora.com",
  company: "METCUB",
  position: "",
  role: "investment-analyst",
  address: {
    street: "",
    city: "",
    zip: "",
    state: "",
    countryCode: DEFAULT_COUNTRY_CODE,
    phone: "",
  },
  consents: { marketing: false, confidentiality: false },
};

export const useProfileStore = create<ProfileState>()((set, get) => ({
  profile: INITIAL_PROFILE,

  setField: (key, value) =>
    set((s) => ({ profile: { ...s.profile, [key]: value } })),

  setAddressField: (key, value) =>
    set((s) => ({
      profile: { ...s.profile, address: { ...s.profile.address, [key]: value } },
    })),

  setConsent: (key, value) =>
    set((s) => ({
      profile: { ...s.profile, consents: { ...s.profile.consents, [key]: value } },
    })),

  hydrateEmail: (email) =>
    set((s) => ({ profile: { ...s.profile, email } })),

  commitProfile: async () => {
    console.info("[settings] commitProfile (v1 = no-op):", get().profile);
    await new Promise((r) => setTimeout(r, 250));
    return { ok: true };
  },
}));

/**
 * Compute the institutional-profile completion ratio (0..1) from the
 * required field roster. Pure function — derives only from `profile`,
 * so it's safe to call inside a selector.
 */
export function computeCompletion(profile: UserProfile): number {
  const filledTopLevel = REQUIRED_FIELDS.filter((k) => {
    const v = profile[k];
    return typeof v === "string" ? v.trim().length > 0 : Boolean(v);
  }).length;
  const filledAddress = REQUIRED_ADDRESS_FIELDS.filter(
    (k) => profile.address[k].trim().length > 0,
  ).length;
  const filledConsents = Object.values(profile.consents).filter(Boolean).length;

  const total = REQUIRED_FIELDS.length + REQUIRED_ADDRESS_FIELDS.length + 2;
  const filled = filledTopLevel + filledAddress + filledConsents;
  return filled / total;
}

/** Convenience selector. */
export function useProfileCompletion(): number {
  return useProfileStore((s) => computeCompletion(s.profile));
}

/** Tuple-style hook. */
export function useProfile() {
  const profile = useProfileStore((s) => s.profile);
  const setField = useProfileStore((s) => s.setField);
  const setAddressField = useProfileStore((s) => s.setAddressField);
  const setConsent = useProfileStore((s) => s.setConsent);
  const hydrateEmail = useProfileStore((s) => s.hydrateEmail);
  const commitProfile = useProfileStore((s) => s.commitProfile);
  return {
    profile,
    setField,
    setAddressField,
    setConsent,
    hydrateEmail,
    commitProfile,
  };
}

/** Role typing helper for Selects. */
export type ProfileRole = UserRole;
