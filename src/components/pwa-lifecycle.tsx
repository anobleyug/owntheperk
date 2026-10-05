"use client";

import { useEffect, useState } from "react";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export function PwaLifecycle() {
  const [offline, setOffline] = useState(false);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" });
    }

    const handleOffline = () => {
      setOffline(true);
      setRestored(false);
    };
    const handleOnline = () => {
      setOffline(false);
      setRestored(true);
      window.setTimeout(() => setRestored(false), 3000);
    };

    const initialStateTimer = window.setTimeout(() => setOffline(!navigator.onLine), 0);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.clearTimeout(initialStateTimer);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!offline && !restored) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-x-4 z-[70] mx-auto max-w-sm rounded-full px-4 py-2.5 text-center text-xs font-semibold shadow-lg ${
        offline ? "bg-brand-ink text-primary-foreground" : "bg-secondary text-secondary-foreground"
      }`}
      style={{ bottom: "calc(5rem + env(safe-area-inset-bottom))" }}
    >
      {offline ? "You're offline. Some screens may be unavailable." : "Back online"}
    </div>
  );
}
