/**
 * RapidAPI Booking — typed endpoint wrappers (v1).
 *
 * One typed function per endpoint we use. Each function:
 *   - Defines the endpoint path (publisher-validated at Phase B).
 *   - Accepts strongly-typed inputs.
 *   - Calls the client.
 *   - Returns the typed `RapidApiResult<T>`.
 *
 * Endpoint paths are placeholders matching the booking-com15 family
 * convention. Adjust at Phase B integration time.
 */

import type { BookingRapidApiClient } from "./client";
import type {
  RapidApiLocationsResponse,
  RapidApiSearchResponse,
  RapidApiHotelDataResponse,
  RapidApiFacilitiesResponse,
  RapidApiResult,
} from "./types";

// ───────────────────────────────────────────────────────────────────────────
// E0 — locations/auto-complete
// ───────────────────────────────────────────────────────────────────────────

export interface LocationsSearchParams {
  query: string;
  languagecode?: string;
}

export const PATH_E0_LOCATIONS = "/api/v1/hotels/searchDestination";

export function searchLocations(
  client: BookingRapidApiClient,
  params: LocationsSearchParams,
): Promise<RapidApiResult<RapidApiLocationsResponse>> {
  return client.execute<RapidApiLocationsResponse>(PATH_E0_LOCATIONS, {
    query: params.query,
    languagecode: params.languagecode ?? "en-us",
  });
}

// ───────────────────────────────────────────────────────────────────────────
// E1 — hotels/search
// ───────────────────────────────────────────────────────────────────────────

export interface HotelsSearchParams {
  destId: string;
  destType?: "city" | "region" | "district";
  pageSize?: number;
  offset?: number;
  sortBy?: "popularity" | "review_score_and_price" | "class_descending";
  arrivalDate?: string; // YYYY-MM-DD — some publishers require a date window
  departureDate?: string; // YYYY-MM-DD
  adults?: number;
  rooms?: number;
}

export const PATH_E1_SEARCH = "/api/v1/hotels/searchHotels";

export function searchHotels(
  client: BookingRapidApiClient,
  params: HotelsSearchParams,
): Promise<RapidApiResult<RapidApiSearchResponse>> {
  return client.execute<RapidApiSearchResponse>(PATH_E1_SEARCH, {
    dest_id: params.destId,
    dest_type: params.destType ?? "city",
    page_size: params.pageSize ?? 60,
    offset: params.offset ?? 0,
    sort_by: params.sortBy ?? "popularity",
    arrival_date: params.arrivalDate,
    departure_date: params.departureDate,
    adults: params.adults ?? 2,
    rooms: params.rooms ?? 1,
  });
}

// ───────────────────────────────────────────────────────────────────────────
// E2 — hotels/data (single hotel detail)
//
// booking-com15 REQUIRES stay-window params even for metadata-only fetch
// (else returns 400). The pipeline uses a stable 1-night window 7 days in
// the future to make TTL-aligned re-fetches idempotent and predictable.
// ───────────────────────────────────────────────────────────────────────────

export interface HotelDataParams {
  hotelId: string;
  languagecode?: string;
  arrivalDate?: string;     // YYYY-MM-DD; defaults to today+7
  departureDate?: string;   // YYYY-MM-DD; defaults to today+8
  adults?: number;
  roomQty?: number;
  units?: "metric" | "imperial";
  temperatureUnit?: "c" | "f";
  currencyCode?: string;
}

export const PATH_E2_DATA = "/api/v1/hotels/getHotelDetails";

function defaultStayWindow(now: Date = new Date()): { arrival: string; departure: string } {
  const arrival = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10);
  const departure = new Date(now.getTime() + 8 * 86400000).toISOString().slice(0, 10);
  return { arrival, departure };
}

export function getHotelData(
  client: BookingRapidApiClient,
  params: HotelDataParams,
): Promise<RapidApiResult<RapidApiHotelDataResponse>> {
  const window = defaultStayWindow();
  return client.execute<RapidApiHotelDataResponse>(PATH_E2_DATA, {
    hotel_id: params.hotelId,
    arrival_date: params.arrivalDate ?? window.arrival,
    departure_date: params.departureDate ?? window.departure,
    adults: params.adults ?? 2,
    children_age: "",
    room_qty: params.roomQty ?? 1,
    units: params.units ?? "metric",
    temperature_unit: params.temperatureUnit ?? "c",
    languagecode: params.languagecode ?? "en-us",
    currency_code: params.currencyCode ?? "EUR",
  });
}

// ───────────────────────────────────────────────────────────────────────────
// E3 — hotels/facilities (granular)
// ───────────────────────────────────────────────────────────────────────────

export const PATH_E3_FACILITIES = "/api/v1/hotels/getHotelFacilities";

export function getHotelFacilities(
  client: BookingRapidApiClient,
  params: HotelDataParams,
): Promise<RapidApiResult<RapidApiFacilitiesResponse>> {
  return client.execute<RapidApiFacilitiesResponse>(PATH_E3_FACILITIES, {
    hotel_id: params.hotelId,
    languagecode: params.languagecode ?? "en-us",
  });
}
