"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";

// Note on auth providers: HotelVALORA runs on Supabase Auth (cookies
// managed by `@supabase/ssr` in middleware + `lib/auth/use-supabase-auth`).
// The Auth.js v5 scaffold stays parked in the repo for future non-OAuth
// flows — but `<SessionProvider>` from `next-auth/react` is NOT mounted
// here. Mounting it makes the client poll `/api/auth/session` on every
// page load, which returns 500 because `AUTH_SECRET` is unset (we don't
// run the Auth.js JWT path). Re-add `<SessionProvider>` only when Auth.js
// reactivates as a real session source.

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
