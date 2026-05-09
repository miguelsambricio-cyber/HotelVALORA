// Country reference for the profile's address picker. Spain default.
//
// v1: hand-curated list of Hotel-Valora-relevant markets (Iberia, EU,
// UK, US, key inbound). v2: replace with Intl.DisplayNames("region")
// lookup against a full ISO 3166-1 list when localisation is wired.

export interface Country {
  /** ISO 3166-1 alpha-2 code */
  code: string;
  name: string;
  /** E.164 dial code with leading "+" */
  dialCode: string;
}

export const COUNTRIES: Country[] = [
  { code: "ES", name: "Spain", dialCode: "+34" },
  { code: "PT", name: "Portugal", dialCode: "+351" },
  { code: "FR", name: "France", dialCode: "+33" },
  { code: "DE", name: "Germany", dialCode: "+49" },
  { code: "IT", name: "Italy", dialCode: "+39" },
  { code: "GB", name: "United Kingdom", dialCode: "+44" },
  { code: "IE", name: "Ireland", dialCode: "+353" },
  { code: "NL", name: "Netherlands", dialCode: "+31" },
  { code: "BE", name: "Belgium", dialCode: "+32" },
  { code: "CH", name: "Switzerland", dialCode: "+41" },
  { code: "US", name: "United States", dialCode: "+1" },
  { code: "MX", name: "Mexico", dialCode: "+52" },
  { code: "AR", name: "Argentina", dialCode: "+54" },
  { code: "BR", name: "Brazil", dialCode: "+55" },
  { code: "AE", name: "United Arab Emirates", dialCode: "+971" },
];

export const DEFAULT_COUNTRY_CODE = "ES";

export function getCountry(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}
