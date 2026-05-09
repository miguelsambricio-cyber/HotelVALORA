/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["mapbox-gl"],
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
};

export default nextConfig;
