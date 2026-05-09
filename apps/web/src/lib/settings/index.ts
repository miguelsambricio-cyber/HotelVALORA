// Settings — public surface.

export type {
  UserProfile,
  UserAddress,
  UserConsents,
  UserRole,
} from "./types";

export type { RoleOption } from "./roles";
export { ROLE_OPTIONS } from "./roles";

export type { Country } from "./countries";
export { COUNTRIES, DEFAULT_COUNTRY_CODE, getCountry } from "./countries";

export {
  useProfileStore,
  useProfile,
  useProfileCompletion,
  computeCompletion,
} from "./store";
