"use client";

import { authClient } from "@/lib/auth-client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Routes exempt from the callsign gate.
 * - auth routes have their own flows
 * - /set-callsign is the onboarding page itself
 */
const EXEMPT_ROUTES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/set-callsign",
];

export function CallsignGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (isPending) return;
    if (!session) return; // unauthenticated pages handle their own redirects
    if (EXEMPT_ROUTES.includes(pathname)) return;
    // Trailing-slash normalization (e.g. "/items/")
    if (EXEMPT_ROUTES.some((r) => pathname === `${r}/`)) return;

    const callsign = (session.user as { callsign?: string | null }).callsign;
    if (!callsign) {
      router.replace("/set-callsign");
    }
  }, [isPending, session, pathname, router]);

  return <>{children}</>;
}