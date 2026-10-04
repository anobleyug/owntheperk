import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Own the Perk",
    template: "%s · Own the Perk",
  },
  description:
    "Discover verified merchant-specific card offers, evaluate pseudonymous reputation, and connect privately.",
  applicationName: "Own the Perk",
  manifest: "/manifest.webmanifest",
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
      <body>{children}</body>
    </html>
  );
}
