import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: { default: "HOTEL VALORA", template: "%s | HOTEL VALORA" },
  description: "Hotel Intelligence & Valuation Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${manrope.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <Toaster position="top-right" richColors />
        </Providers>
        {/* Vercel Analytics — cookie-free, GDPR-compliant page-view + event
            tracking. No-op outside production deploys on Vercel. */}
        <Analytics />
        {/* Vercel Speed Insights — Real User Monitoring of Core Web Vitals
            (LCP, FID, CLS, INP, TTFB). Same no-op behaviour outside Vercel
            production deploys. */}
        <SpeedInsights />
      </body>
    </html>
  );
}
