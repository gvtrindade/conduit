/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import { Serwist, NetworkFirst, CacheFirst } from "serwist";

declare const self: ServiceWorkerGlobalScope & typeof globalThis;

const serwist = new Serwist({
  precacheEntries: (self as any).__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    ...defaultCache,
    {
      matcher: ({ url }) => url.pathname.startsWith("/api/"),
      handler: new NetworkFirst({
        cacheName: "api-cache",
      }),
    },
    {
      matcher: ({ request }) => request.destination === "image",
      handler: new CacheFirst({
        cacheName: "image-cache",
      }),
    },
  ],
});

serwist.addEventListeners();