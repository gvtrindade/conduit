"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isAuthRoute } from "@/lib/route-config";

const navItems = [
  { href: "/", icon: "$", label: "RCPTS" },
  { href: "/items", icon: "#", label: "ITEMS" },
  { href: "/manifests", icon: "=", label: "LISTS" },
  { href: "/analytics", icon: "~", label: "ANLTX" },
  { href: "/profile", icon: "@", label: "PROF" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const isAuth = isAuthRoute(pathname);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-panel border-t-2 border-border-custom px-0 pt-2.5 pb-6 flex justify-around z-50">
      {navItems.map(({ href, icon, label }) => {
        const isActive = isAuth
          ? href === "/profile"
          : href === "/"
            ? pathname === "/"
            : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1 cursor-pointer no-underline"
          >
            <span
              className={`font-mono text-lg font-bold ${isActive ? "text-amber" : "text-sand"}`}
              style={
                isActive
                  ? { textShadow: "0 0 12px rgba(217,140,69,0.6)" }
                  : undefined
              }
            >
              {icon}
            </span>
            <span
              className={`font-mono text-[8px] uppercase tracking-widest ${isActive ? "text-amber" : "text-sand"}`}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
