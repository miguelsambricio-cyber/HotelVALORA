// One-shot smoke for the Booking integration. Loads .env.local, picks a
// Madrid hotel from the snapshot, runs the search → details → mapper
// path, prints a short summary. Run with:
//   cd apps/web && node --env-file=.env.local scripts/smoke-booking.mjs
//
// Quota cost: ~3 RapidAPI calls per execution.

const HOST = process.env.BOOKING_RAPIDAPI_HOST ?? "booking-com15.p.rapidapi.com";
const KEY = process.env.BOOKING_RAPIDAPI_KEY;
if (!KEY) {
  console.error("BOOKING_RAPIDAPI_KEY not set in env.local");
  process.exit(1);
}

async function rapid(path, params) {
  const u = new URL(`https://${HOST}${path}`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const res = await fetch(u.toString(), {
    headers: {
      "x-rapidapi-host": HOST,
      "x-rapidapi-key": KEY,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`${path} ${res.status}: ${await res.text()}`);
  return res.json();
}

const target = { name: "Hotel Wellington", market: "Madrid", country: "ES" };

console.log("[1/3] searchDestination · query=", target.market);
const dest = await rapid("/api/v1/hotels/searchDestination", { query: target.market });
const city = dest.data?.find(
  (d) => d.dest_type === "city" || d.dest_type === "district",
) ?? dest.data?.[0];
if (!city) {
  console.error("no destination hits");
  process.exit(2);
}
console.log("    →", city.dest_id, "·", city.name, "·", city.country);

console.log("[2/3] searchHotels · dest_id=", city.dest_id);
const today = new Date();
const arrival = new Date(today.getTime() + 30 * 86400_000).toISOString().slice(0, 10);
const departure = new Date(today.getTime() + 31 * 86400_000).toISOString().slice(0, 10);
const hits = await rapid("/api/v1/hotels/searchHotels", {
  dest_id: city.dest_id,
  search_type: (city.dest_type ?? "CITY").toUpperCase(),
  arrival_date: arrival,
  departure_date: departure,
  adults: "1",
  children_age: "",
  room_qty: "1",
  page_number: "1",
  units: "metric",
  temperature_unit: "c",
  languagecode: "en-us",
  currency_code: "EUR",
});
const all = hits.data?.hotels ?? [];
const filtered = all.filter((h) =>
  (h.property?.name ?? "").toLowerCase().includes(target.name.toLowerCase()),
);
const candidate = filtered[0] ?? all[0];
if (!candidate) {
  console.error("no hotels for that destination");
  process.exit(3);
}
console.log("    → hotel_id", candidate.hotel_id, "·", candidate.property?.name);
console.log(
  "    → review",
  candidate.property?.reviewScore,
  "(",
  candidate.property?.reviewCount,
  ") · class",
  candidate.property?.accuratePropertyClass,
);

console.log("[3/3] getHotelDetails · hotel_id=", candidate.hotel_id);
const details = await rapid("/api/v1/hotels/getHotelDetails", {
  hotel_id: String(candidate.hotel_id),
  arrival_date: arrival,
  departure_date: departure,
  adults: "1",
  children_age: "",
  room_qty: "1",
  units: "metric",
  temperature_unit: "c",
  languagecode: "en-us",
  currency_code: "EUR",
});
const d = details.data ?? {};
const facilityNames = [];
for (const f of d.facilities_block?.facilities ?? []) {
  if (f.name) facilityNames.push(f.name);
}
for (const hl of d.property_highlight_strip ?? []) {
  if (hl.name) facilityNames.push(hl.name);
}
console.log("    → url", d.url);
console.log("    → review_score", d.review_score, "review_nr", d.review_nr);
console.log("    → checkin", d.checkin?.from ?? d.arrival_time, "→", d.checkout?.until);
console.log("    → facilities (top 12):");
for (const n of facilityNames.slice(0, 12)) console.log("        ·", n);
console.log("    → total facility names:", facilityNames.length);
console.log("\nSMOKE OK");
