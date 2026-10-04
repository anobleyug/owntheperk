import {
  ArrowRight,
  BadgeCheck,
  EyeOff,
  LockKeyhole,
  MessageCircle,
  Search,
  ShieldCheck,
  Star,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

import { Brand } from "@/components/brand";
import { MarketingHeader } from "@/components/marketing-header";
import { buttonVariants } from "@/components/ui/button";
import { OfferPreviewCard } from "@/features/marketplace/components/offer-preview-card";

const steps = [
  {
    icon: Search,
    title: "Discover by merchant",
    description: "Search for the merchants you already plan to shop with.",
  },
  {
    icon: ShieldCheck,
    title: "Evaluate trust",
    description: "Compare verified offer details and pseudonymous reputation.",
  },
  {
    icon: MessageCircle,
    title: "Connect privately",
    description: "Unlock a private conversation when you find a relevant listing.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-svh overflow-hidden">
      <MarketingHeader />

      <main>
        <section className="paper-grid relative border-b border-border">
          <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_50%_0%,rgba(176,222,203,0.6),transparent_68%)]" />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:px-8 lg:py-28">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-card/90 px-3 py-1.5 text-xs font-semibold text-primary shadow-sm">
                <BadgeCheck aria-hidden="true" className="size-4" />
                Pseudonymous, reputation-led discovery
              </p>
              <h1 className="mt-6 text-5xl leading-[0.98] font-semibold tracking-[-0.065em] text-balance sm:text-6xl lg:text-7xl">
                Find verified merchant offers.{" "}
                <span className="text-primary">Connect privately.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                Discover people with relevant merchant-specific card offers, review
                pseudonymous reputation, and decide who you want to talk to.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/search" className={buttonVariants({ size: "lg" })}>
                  Browse the marketplace
                  <ArrowRight aria-hidden="true" />
                </Link>
                <a
                  href="#how-it-works"
                  className={buttonVariants({ variant: "outline", size: "lg" })}
                >
                  See how it works
                </a>
              </div>
              <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                <EyeOff aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                Card details and offer evidence stay private. The platform verifies,
                discovers, and connects—it does not sell or transfer offers.
              </p>
            </div>

            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <div className="absolute -inset-8 rounded-[3rem] bg-brand-mint/45 blur-3xl" />
              <div className="relative rotate-[-1.25deg] rounded-[2rem] border border-white/80 bg-white/70 p-3 shadow-[0_35px_90px_-45px_rgba(12,55,58,0.55)] backdrop-blur-sm sm:p-5">
                <div className="mb-3 flex items-center justify-between px-1 py-1 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Featured listing</span>
                  <span>Marketplace preview</span>
                </div>
                <OfferPreviewCard
                  merchant="Adobe"
                  spend="$600"
                  reward="$250 credit"
                  expires="Dec 31"
                  username="DealPilot82"
                  rating="4.9"
                  interactions={31}
                />
                <div className="mt-3 flex items-center justify-between rounded-2xl bg-brand-ink px-4 py-3 text-primary-foreground">
                  <span className="text-sm font-semibold">Unlock chat</span>
                  <span className="text-sm font-semibold">$1.99</span>
                </div>
              </div>
              <div className="absolute -right-2 -bottom-5 flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2.5 text-xs font-semibold shadow-lg sm:-right-6">
                <Star aria-hidden="true" className="size-4 fill-[#d99c35] text-[#d99c35]" />
                Reputation you can evaluate
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
              A clearer path to connection
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-balance sm:text-5xl">
              Discovery built around proof and reputation.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {steps.map(({ description, icon: Icon, title }, index) => (
              <article key={title} className="rounded-3xl border border-border bg-card p-6">
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-2xl bg-secondary text-primary">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-8 text-lg font-semibold tracking-[-0.025em]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-brand-ink text-primary-foreground">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-24">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-[#a8d8cb] uppercase">
                The boundary is the feature
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-balance sm:text-5xl">
                We help people find each other. What happens next is theirs to decide.
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { icon: BadgeCheck, label: "Evidence-based offer verification" },
                { icon: UsersRound, label: "Pseudonymous public profiles" },
                { icon: LockKeyhole, label: "Private conversation access" },
                { icon: EyeOff, label: "No public cardholder details" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex min-h-24 items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#a8d8cb]" />
                  <p className="text-sm leading-6 text-white/82">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:py-28">
          <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
            Start with a merchant
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-balance sm:text-5xl">
            See who has an offer worth a conversation.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Offer verification confirms that evidence existed at review time. It does not
            guarantee that a future purchase will qualify for a benefit.
          </p>
          <Link href="/search" className={buttonVariants({ size: "lg", className: "mt-8" })}>
            Explore the app preview
            <ArrowRight aria-hidden="true" />
          </Link>
        </section>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <Brand />
          <p>Discovery, verification, reputation, and private connection.</p>
        </div>
      </footer>
    </div>
  );
}
