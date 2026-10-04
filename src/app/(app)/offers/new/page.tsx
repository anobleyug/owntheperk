import { ArrowLeft, FileLock2, ListPlus } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";

const plannedSteps = [
  "Select a private card profile",
  "Choose a merchant",
  "Enter offer terms",
  "Upload private evidence",
  "Submit for verification",
];

export default function NewOfferPage() {
  return (
    <div className="space-y-8">
      <Link
        href="/offers"
        className="inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-semibold text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        My offers
      </Link>

      <PageHeader
        eyebrow="Listing workflow preview"
        title="Add an offer"
        description="The secure card, evidence upload, and submission flow will be implemented after the database and RLS foundation."
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-3xl border border-border bg-card p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-secondary text-primary">
              <ListPlus aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h2 className="font-semibold">Planned listing steps</h2>
              <p className="text-xs text-muted-foreground">No data is submitted on this screen.</p>
            </div>
          </div>
          <ol className="mt-7 space-y-3">
            {plannedSteps.map((step, index) => (
              <li key={step} className="flex min-h-14 items-center gap-3 rounded-2xl bg-muted/75 px-4">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-card text-xs font-bold text-primary shadow-sm">
                  {index + 1}
                </span>
                <span className="text-sm font-medium">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <aside className="h-fit rounded-3xl bg-brand-ink p-6 text-primary-foreground">
          <FileLock2 aria-hidden="true" className="size-6 text-[#a8d8cb]" />
          <h2 className="mt-5 text-lg font-semibold">Evidence stays private</h2>
          <p className="mt-2 text-sm leading-6 text-white/75">
            Future uploads will use private Supabase Storage and short-lived signed URLs,
            accessible only to the owner and authorized reviewers.
          </p>
          <span className={buttonVariants({ variant: "secondary", className: "mt-6 w-full opacity-70" })}>
            Available in a later phase
          </span>
        </aside>
      </div>
    </div>
  );
}
