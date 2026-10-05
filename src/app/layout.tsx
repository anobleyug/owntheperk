import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { PwaLifecycle } from "@/components/pwa-lifecycle";
import { QueryProvider } from "@/components/query-provider";
import { publicEnv } from "@/lib/env/client";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.NEXT_PUBLIC_APP_URL),
  title: {
    default: "Own the Perk",
    template: "%s · Own the Perk",
  },
  description:
    "Find verified card offers, compare anonymous seller ratings, and connect privately.",
  applicationName: "Own the Perk",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Own the Perk",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#174f53",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          {children}
          <PwaLifecycle />
        </QueryProvider>
      </body>
    </html>
  );
}
