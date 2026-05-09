// Settings — canonical types for the authenticated profile shell.
//
// `UserProfile` is the source-of-truth shape consumed by every settings
// surface (Profile / Credentials / Investment / future). Backend swap path:
// the same shape maps onto the future `users.profile_jsonb` Postgres
// column or its split-out tables. UI never sees raw Excel / SQL.

export type UserRole =
  | "investment-analyst"
  | "asset-manager"
  | "hotel-operator"
  | "investor"
  | "consultant"
  | "lender"
  | "broker"
  | "other";

export interface UserAddress {
  street: string;
  city: string;
  zip: string;
  state: string;
  /** ISO 3166-1 alpha-2 country code (e.g. "ES", "FR") */
  countryCode: string;
  /** Local phone number — dial code derived from countryCode */
  phone: string;
}

export interface UserConsents {
  /** Marketing / promotional contact opt-in */
  marketing: boolean;
  /** Confidentiality + general clauses agreement */
  confidentiality: boolean;
}

export interface UserProfile {
  firstName: string;
  middleName?: string;
  lastName: string;
  /** Locked — derived from auth provider, not editable in profile UI */
  email: string;
  company: string;
  position: string;
  role: UserRole;
  address: UserAddress;
  consents: UserConsents;
}
