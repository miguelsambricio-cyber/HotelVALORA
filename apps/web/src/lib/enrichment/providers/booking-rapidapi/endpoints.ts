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
  BookingLocationsResponse,
  BookingSearchResponse,
  BookingHotelDetailsResponse,
  BookingFacilitiesResponse,
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
): Promise<RapidApiResult<BookingLocationsResponse>> {
  return client.execute<BookingLocationsResponse>(PATH_E0_LOCATIONS, {
    query: params.query,
    languagecode: params.languagecode ?? "en-us",
  });
}

// ───────────────────────────────────────────────────────────────────────────
// E1 — hotels/search
// ───────────────────────────────────────────────────────────────────────────

export interface HotelsSearchParams {
  destId: string;
  /** booking-com15 expects `search_type` (NOT `dest_type`). Confirmed live. */
  searchType?: "CITY" | "REGION" | "DISTRICT" | "LANDMARK";
  pageNumber?: number;          // 1-indexed, default 1
  sortBy?: "popularity" | "review_score_and_price" | "class_descending" | "price";
  /** YYYY-MM-DD — REQUIRED by booking-com15 (E1 returns 400 without it). */
  arrivalDate: string;
  departureDate: string;
  adults?: number;
  roomQty?: number;
  childrenAge?: string;         // CSV ages, empty string for "no children"
  languagecode?: string;
  currencyCode?: string;
  units?: "metric" | "imperial";
  temperatureUnit?: "c" | "f";
}

export const PATH_E1_SEARCH = "/api/v1/hotels/searchHotels";

export function searchHotels(
  client: BookingRapidApiClient,
  params: HotelsSearchParams,
): Promise<RapidApiResult<BookingSearchResponse>> {
  return client.execute<BookingSearchResponse>(PATH_E1_SEARCH, {
    dest_id: params.destId,
    search_type: params.searchType ?? "CITY",
    page_number: params.pageNumber ?? 1,
    sort_by: params.sortBy ?? "popularity",
    arrival_date: params.arrivalDate,
    departure_date: params.departureDate,
    adults: params.adults ?? 2,
    children_age: params.childrenAge ?? "",
    room_qty: params.roomQty ?? 1,
    units: params.units ?? "metric",
    temperature_unit: params.temperatureUnit ?? "c",
    languagecode: params.languagecode ?? "en-us",
    currency_code: params.currencyCode ?? "EUR",
  });
}

// ───────────────────────────────────────────────────────────────────────────
// E2 — hotels/data (single hotel detail)
// ───────────────────────────────────────────────────────────────────────────

export interface HotelDataParams {
  hotelId: string | number;
  /** Same required params as E1 — booking-com15 returns 400 without them. */
  arrivalDate: string;
  departureDate: string;
  adults?: number;
  childrenAge?: string;
  roomQty?: number;
  languagecode?: string;
  currencyCode?: string;
  units?: "metric" | "imperial";
  temperatureUnit?: "c" | "f";
}

export const PATH_E2_DATA = "/api/v1/hotels/getHotelDetails";

export function getHotelData(
  client: BookingRapidApiClient,
  params: HotelDataParams,
): Promise<RapidApiResult<BookingHotelDetailsResponse>> {
  return client.execute<BookingHotelDetailsResponse>(PATH_E2_DATA, {
    hotel_id: params.hotelId,
    arrival_date: params.arrivalDate,
    departure_date: params.departureDate,
    adults: params.adults ?? 2,
    children_age: params.childrenAge ?? "",
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
): Promise<RapidApiResult<BookingFacilitiesResponse>> {
  return client.execute<BookingFacilitiesResponse>(PATH_E3_FACILITIES, {
    hotel_id: params.hotelId,
    arrival_date: params.arrivalDate,
    departure_date: params.departureDate,
    adults: params.adults ?? 2,
    children_age: params.childrenAge ?? "",
    room_qty: params.roomQty ?? 1,
    units: params.units ?? "metric",
    temperature_unit: params.temperatureUnit ?? "c",
    languagecode: params.languagecode ?? "en-us",
    currency_code: params.currencyCode ?? "EUR",
  });
}

// ───────────────────────────────────────────────────────────────────────────
// E4 — hotels/photos · returns ~40 image URLs from cf.bstatic.com CDN
// ───────────────────────────────────────────────────────────────────────────

export interface HotelPhotosParams {
  hotelId: string | number;
  languagecode?: string;
}

/** Raw photo response shape · the booking-com15 family returns an array
 *  of objects with a `url_max` or `url_original` field per photo. We use
 *  defensive parsing in map-to-canonical · cast as `unknown` here. */
export type BookingPhotosResponse = unknown;

export const PATH_E4_PHOTOS = "/api/v1/hotels/getHotelPhotos";

export function getHotelPhotos(
  client: BookingRapidApiClient,
  params: HotelPhotosParams,
): Promise<RapidApiResult<BookingPhotosResponse>> {
  return client.execute<BookingPhotosResponse>(PATH_E4_PHOTOS, {
    hotel_id: params.hotelId,
    languagecode: params.languagecode ?? "en-us",
  });
}

// ───────────────────────────────────────────────────────────────────────────
// E5 — hotels/room-list · room types, configurations, prices
// ───────────────────────────────────────────────────────────────────────────

export type BookingRoomListResponse = unknown;

export const PATH_E5_ROOM_LIST = "/api/v1/hotels/getRoomList";

export function getRoomList(
  client: BookingRapidApiClient,
  params: HotelDataParams,
): Promise<RapidApiResult<BookingRoomListResponse>> {
  return client.execute<BookingRoomListResponse>(PATH_E5_ROOM_LIST, {
    hotel_id: params.hotelId,
    arrival_date: params.arrivalDate,
    departure_date: params.departureDate,
    adults: params.adults ?? 2,
    children_age: params.childrenAge ?? "",
    room_qty: params.roomQty ?? 1,
    units: params.units ?? "metric",
    temperature_unit: params.temperatureUnit ?? "c",
    languagecode: params.languagecode ?? "en-us",
    currency_code: params.currencyCode ?? "EUR",
  });
}
