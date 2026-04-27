"use client";

import { useEffect, useState } from "react";

export function ServiceWorkerRegister() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [updateFound, setUpdateFound] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").then((reg) => {
      setRegistration(reg);
      reg.addEventListener("updatefound", () => {
        setUpdateFound(true);
      });
    });
  }, []);

  const handleUpdate = () => {
    registration?.waiting?.postMessage({ type: "SKIP_WAITING" });
    window.location.reload();
  };

  if (!updateFound) return null;

  return (
    <button
      onClick={handleUpdate}
      className="fixed bottom-20 left-4 right-4 bg-accent text-hull py-2 px-4 rounded z-50"
    >
      Update available — tap to reload
    </button>
  );
}