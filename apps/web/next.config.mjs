/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // NOTE · do NOT add mapbox-gl to `transpilePackages`.
  // mapbox-gl v3 ships its WebWorker bundle pre-built and tells the runtime
  // to wire it via Blob URL (see node_modules/mapbox-gl/dist/mapbox-gl.js).
  // Transpiling the package through Next.js's SWC pipeline corrupts that
  // worker setup · the symptom is a Mapbox map that mounts (watermark +
  // <Marker> children visible) but renders no base tiles (uniform gray
  // canvas · no streets/labels/terrain). Mapbox docs explicitly forbid
  // transpilation: https://docs.mapbox.com/mapbox-gl-js/guides/install/#transpiling
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  images: {
    // CDN hosts allowed for next/image. Plain <img> tags ignore this list, so
    // existing components keep working — these patterns make a future
    // migration to <Image> drop-in.
    remotePatterns: [
      // Stitch CDN — placeholder hotel / map / gallery images shipped with
      // the section integrations (Asset Analysis, Market Overview, Projects,
      // Transactions, etc.). Replace with S3 / Cloudinary in production.
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      // Transactions gallery placeholders
      { protocol: "https", hostname: "images.unsplash.com" },
      // Future S3 + CloudFront pipeline for hotel photos / renders
      { protocol: "https", hostname: "**.cloudfront.net" },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"}/:path*`,
      },
    ];
  },
  /**
   * Admin URL canonicalisation — HTTP-level redirects.
   *
   * The Administrator surface lives at /user/admin. Three "natural" URLs
   * operators tend to type / bookmark / share get permanently routed
   * here. We use next.config redirects() (vs the App Router page-level
   * `redirect()` helper) because they emit a real HTTP Location header,
   * which browsers + crawlers + curl all follow correctly. App Router
   * `redirect()` only encodes the redirect inside the RSC payload, which
   * does not work for cold browser navigations or external links.
   */
  async redirects() {
    return [
      { source: "/admin", destination: "/user/admin", permanent: true },
      { source: "/admin/:path*", destination: "/user/admin/:path*", permanent: true },
      { source: "/settings/admin", destination: "/user/admin", permanent: true },
      { source: "/settings/admin/:path*", destination: "/user/admin/:path*", permanent: true },
      { source: "/user", destination: "/user/admin", permanent: false },
    ];
  },
};

export default nextConfig;
