// Canonical image gallery primitives. Re-exports the existing hotel gallery
// implementation under generic names so future sections (asset analysis,
// market overview) can reuse the same building blocks without coupling to
// the competitive-set namespace.

export { HotelGalleryGrid as ImageGallery } from "@/components/report/competitive-set/hotel-gallery-grid";
export { HotelGalleryCard as ImageGalleryCard } from "@/components/report/competitive-set/hotel-gallery-card";
