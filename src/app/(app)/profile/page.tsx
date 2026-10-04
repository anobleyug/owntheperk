import { BadgeCheck, CalendarDays, MessageCircleReply, ShieldCheck, Star } from "lucide-react";

import { PageHeader } from "@/components/page-header";

export default function ProfilePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Pseudonymous identity"
        title="Profile"
        description="Public profiles will expose reputation signals—not contact, cardholder, or payment details."
      />

      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="h-24 bg-[linear-gradient(120deg,#c9e8db,#eadcae)]" />
        <div className="px-5 pb-6 sm:px-7">
          <div className="-mt-9 flex items-end justify-between gap-4">
            <span className="grid size-20 place-items-center rounded-3xl border-4 border-card bg-brand-ink text-xl font-bold text-primary-foreground">
              PF
            </span>
            <span className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-primary">
              <ShieldCheck aria-hidden="true" className="size-3.5" />
              Phone verified
            </span>
          </div>
          <h2 className="mt-4 text-2xl font-semibold tracking-[-0.035em]">PerkFinder</h2>
          <p className="mt-1 text-sm text-muted-foreground">Profile preview</p>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Star, value: "—", label: "Rating" },
              { icon: MessageCircleReply, value: "0", label: "Interactions" },
              { icon: BadgeCheck, value: "0", label: "Active offers" },
              { icon: CalendarDays, value: "2026", label: "Joined" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-2xl bg-muted/75 p-3.5">
                <Icon aria-hidden="true" className="size-4 text-primary" />
                <p className="mt-4 text-lg font-semibold">{value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-semibold">Private account data</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Email, phone number, card profiles, verification evidence, and payment details
          will never appear on this public-facing profile surface.
        </p>
      </section>
    </div>
  );
}
