import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { logoutAction } from "@/features/auth/actions";

export default function AccountSuspendedPage() {
  return <main className="grid min-h-svh place-items-center bg-background p-5">
    <section className="w-full max-w-lg rounded-3xl border border-border bg-card p-7 text-center shadow-sm">
      <ShieldAlert aria-hidden="true" className="mx-auto size-10 text-primary" />
      <h1 className="mt-4 text-2xl font-semibold">Account suspended</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Marketplace access and new interactions are unavailable while this account is under review.</p>
      <form action={logoutAction} className="mt-6"><Button type="submit" variant="outline">Log out</Button></form>
    </section>
  </main>;
}
