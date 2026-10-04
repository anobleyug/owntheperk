import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

export default function AuthenticatedAppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
