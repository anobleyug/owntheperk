import type { Metadata } from "next";
import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  Check,
  CreditCard,
  EyeOff,
  LockKeyhole,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Tag,
} from "lucide-react";
import Link from "next/link";

import { Brand } from "@/components/brand";
import { MarketingHeader } from "@/components/marketing-header";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Find and list unused credit card offers",
  description:
    "Find people with unused credit card offers for brands you already plan to buy from, or list an offer you are not using.",
};

const howItWorks = [
  {
    icon: Search,
    title: "Find or list an offer",
    description:
      "Search for a merchant you're shopping with, or list a card offer you already have.",
  },
  {
    icon: Tag,
    title: "Compare the numbers",
    description:
      "Buyers see the card benefit, minimum spend, asking amount, whether OBO is accepted, verification status, and community rating.",
  },
  {
    icon: MessageCircle,
    title: "Connect privately",
    description:
      "Pay the small connection fee when you find a match. The seller's anonymous marketplace profile is revealed only after connection.",
  },
];

const trustItems = [
  { icon: BadgeCheck, label: "Offer evidence reviewed before listing" },
  { icon: Star, label: "Ratings from previous connections" },
  { icon: EyeOff, label: "Anonymous seller identity before paid connection" },
  { icon: CreditCard, label: "Card details never shown publicly" },
  { icon: LockKeyhole, label: "No card numbers or login credentials shared" },
];

function BuyerExampleCard() {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[0_24px_70px_-45px_rgba(12,55,58,0.55)]">
      <div className="flex items-center justify-between border-b border-border bg-muted/55 px-5 py-4">
        <div>
          <p className="text-xl font-semibold tracking-[-0.03em]">Adobe</p>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">Card Offer</p>
        </div>
        <span className="grid size-11 place-items-center rounded-2xl bg-[#ed2b3a] text-sm font-bold text-white">A</span>
      </div>

      <div className="p-5">
        <div className="rounded-2xl bg-secondary/70 p-4">
          <p className="text-xs font-semibold tracking-[0.12em] text-primary uppercase">Card benefit</p>
          <p className="mt-1.5 text-xl font-semibold tracking-[-0.025em]">
            Spend $600 <span className="text-primary">→ Get $250 back</span>
          </p>
        </div>

        <div className="mt-5">
          <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">Seller terms</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border p-3">
              <p className="text-xs text-muted-foreground">Min Spend</p>
              <p className="mt-1 text-lg font-semibold">$600</p>
            </div>
            <div className="rounded-2xl border border-border p-3">
              <p className="text-xs text-muted-foreground">Ask</p>
              <p className="mt-1 text-lg font-semibold">$500 <span className="text-sm text-primary">OBO</span></p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff5d9] px-3 py-1.5 text-[#79510b]">
            <Star aria-hidden="true" className="size-3.5 fill-current" /> 4.9 rating
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-primary">
            <BadgeCheck aria-hidden="true" className="size-3.5" /> Offer verified
          </span>
        </div>

        <div className="mt-5 flex min-h-12 items-center justify-between rounded-full bg-brand-ink px-5 text-sm font-semibold text-primary-foreground">
          <span>Unlock connection</span>
          <span>$1.99</span>
        </div>
      </div>
    </div>
  );
}

function SellerExampleCard() {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[0_24px_70px_-45px_rgba(12,55,58,0.55)]">
      <div className="flex items-center gap-3 border-b border-border bg-muted/55 px-5 py-4">
        <span className="grid size-10 place-items-center rounded-xl bg-brand-ink text-primary-foreground">
          <CreditCard aria-hidden="true" className="size-5" />
        </span>
        <div>
          <p className="text-xs font-medium text-muted-foreground">Your card offer</p>
          <p className="font-semibold">Adobe</p>
        </div>
      </div>

      <div className="p-5">
        <div className="rounded-2xl bg-secondary/70 p-4">
          <p className="text-xs font-semibold tracking-[0.12em] text-primary uppercase">Card benefit</p>
          <p className="mt-1.5 text-lg font-semibold tracking-[-0.025em] sm:text-xl">
            Spend $600 <span className="text-primary">→ Get $250 back</span>
          </p>
        </div>

        <div className="mt-5">
          <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">Your listing</p>
          <dl className="mt-3 divide-y divide-border rounded-2xl border border-border px-4">
            <div className="flex items-center justify-between py-3 text-sm">
              <dt className="text-muted-foreground">Min Spend</dt>
              <dd className="font-semibold">$600</dd>
            </div>
            <div className="flex items-center justify-between py-3 text-sm">
              <dt className="text-muted-foreground">Ask</dt>
              <dd className="font-semibold">$500</dd>
            </div>
            <div className="flex items-center justify-between py-3 text-sm">
              <dt className="text-muted-foreground">OBO</dt>
              <dd className="font-semibold text-primary">Yes</dd>
            </div>
          </dl>
        </div>

        <div className="mt-5 flex min-h-12 items-center justify-between rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">
          <span>List offer</span>
          <span>$0.99</span>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-svh overflow-hidden">
      <MarketingHeader />

      <main>
        <section className="paper-grid relative border-b border-border">
          <div className="absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_50%_0%,rgba(176,222,203,0.72),transparent_67%)]" />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.06fr_0.94fr] lg:items-center lg:gap-20 lg:px-8 lg:py-24">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-card/90 px-3 py-1.5 text-xs font-semibold text-primary shadow-sm">
                <Sparkles aria-hidden="true" className="size-4" /> Make an unused card offer useful
              </p>
              <h1 className="mt-6 text-[2.75rem] leading-[0.98] font-semibold tracking-[-0.06em] text-balance sm:text-6xl lg:text-[4.4rem]">
                Someone has a card offer for where you&apos;re shopping.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                Find people with unused credit card offers for brands you already plan to buy from — or list an offer you aren&apos;t using.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/search" className={buttonVariants({ size: "lg" })}>
                  Find an Offer <ArrowRight aria-hidden="true" />
                </Link>
                <Link href="/offers/new" className={buttonVariants({ variant: "outline", size: "lg" })}>
                  List My Offer
                </Link>
              </div>
              <p className="mt-5 text-center text-xs font-medium leading-5 text-muted-foreground sm:text-left sm:text-sm">
                Anonymous until you connect <span aria-hidden="true">·</span> Verified offers <span aria-hidden="true">·</span> Community ratings
              </p>
            </div>

            <div className="relative mx-auto w-full max-w-md lg:max-w-lg">
              <div className="absolute -inset-10 rounded-[4rem] bg-brand-mint/45 blur-3xl" />
              <div className="relative rounded-[2rem] border border-white/90 bg-white/80 p-3 shadow-[0_35px_90px_-45px_rgba(12,55,58,0.55)] backdrop-blur-sm sm:p-5">
                <div className="rounded-[1.4rem] border border-border bg-card p-5">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-2xl bg-[#ed2b3a] text-sm font-bold text-white">A</span>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Shopping at</p>
                      <p className="text-lg font-semibold">Adobe</p>
                    </div>
                  </div>
                  <div className="my-5 flex items-center gap-3" aria-hidden="true">
                    <span className="h-px flex-1 bg-border" />
                    <span className="grid size-8 place-items-center rounded-full bg-secondary text-primary"><ArrowDown className="size-4" /></span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  <div className="rounded-2xl bg-brand-ink p-5 text-primary-foreground">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold tracking-[0.12em] text-[#a8d8cb] uppercase">Available card offer</p>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#a8d8cb]">
                        <BadgeCheck aria-hidden="true" className="size-3.5" /> Verified
                      </span>
                    </div>
                    <p className="mt-3 text-xl font-semibold">Spend $600 → Get $250 back</p>
                    <div className="mt-5 flex items-end justify-between border-t border-white/12 pt-4">
                      <div>
                        <p className="text-xs text-white/60">Asking amount</p>
                        <p className="mt-0.5 text-2xl font-semibold">$500 <span className="text-sm text-[#a8d8cb]">OBO</span></p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold">
                        <Star aria-hidden="true" className="size-4 fill-[#f2bf5e] text-[#f2bf5e]" /> 4.9
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -right-2 -bottom-4 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold shadow-lg sm:-right-5">
                Seller stays anonymous
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">Two ways to use Own the Perk</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-balance sm:text-5xl">
              Shop smarter—or share what you won&apos;t use.
            </h2>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <article className="rounded-[2rem] border border-border bg-[#f8fbf8] p-5 sm:p-8">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-secondary text-primary"><Store aria-hidden="true" className="size-5" /></span>
                <div>
                  <p className="text-sm font-medium text-primary">Looking to save?</p>
                  <h3 className="text-2xl font-semibold tracking-[-0.035em]">Find an Offer</h3>
                </div>
              </div>
              <p className="mt-5 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                Planning to spend at Adobe, Dell, Nike, Marriott, or another merchant?
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                Search the merchant, compare available offers and ratings, then connect with the person whose listing works for you.
              </p>
              <div className="mt-7"><BuyerExampleCard /></div>
            </article>

            <article className="rounded-[2rem] border border-border bg-[#fdf9f1] p-5 sm:p-8">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-[#f8e6b6] text-[#76520f]"><CreditCard aria-hidden="true" className="size-5" /></span>
                <div>
                  <p className="text-sm font-medium text-[#76520f]">Have an offer you won&apos;t use?</p>
                  <h3 className="text-2xl font-semibold tracking-[-0.035em]">List Your Offer</h3>
                </div>
              </div>
              <p className="mt-5 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                If your credit card has an offer you&apos;re unlikely to use, create a listing and make yourself available to someone shopping at that merchant.
              </p>
              <p className="mt-2 flex items-start gap-2 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
                We review evidence of the offer before publishing your listing.
              </p>
              <div className="mt-7"><SellerExampleCard /></div>
            </article>
          </div>
        </section>

        <section id="how-it-works" className="border-y border-border bg-card">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">How it works</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-balance sm:text-5xl">
                Three steps. You choose who to trust.
              </h2>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {howItWorks.map(({ description, icon: Icon, title }, index) => (
                <article key={title} className="rounded-3xl border border-border bg-background p-6">
                  <div className="flex items-center justify-between">
                    <span className="grid size-11 place-items-center rounded-2xl bg-secondary text-primary"><Icon aria-hidden="true" className="size-5" /></span>
                    <span className="text-sm font-semibold text-muted-foreground">{index + 1}</span>
                  </div>
                  <h3 className="mt-7 text-lg font-semibold tracking-[-0.025em]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="overflow-hidden rounded-[2rem] bg-brand-ink text-primary-foreground shadow-[0_30px_80px_-45px_rgba(12,55,58,0.8)]">
            <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:p-14">
              <div>
                <p className="text-xs font-semibold tracking-[0.16em] text-[#a8d8cb] uppercase">Example</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-balance sm:text-5xl">See the numbers before you connect.</h2>
                <p className="mt-5 max-w-lg text-sm leading-6 text-white/70 sm:text-base sm:leading-7">
                  A buyer planning a $600 Adobe purchase can discover the listing and decide whether they want to connect.
                </p>
              </div>

              <div className="rounded-[1.75rem] bg-white p-5 text-foreground sm:p-7">
                <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                  <div className="rounded-2xl bg-muted p-4">
                    <p className="text-xs font-semibold text-muted-foreground">A cardholder has</p>
                    <p className="mt-2 text-xl font-semibold">Adobe</p>
                    <p className="mt-1 text-sm font-medium text-primary">Spend $600 → Receive $250 back</p>
                  </div>
                  <ArrowRight aria-hidden="true" className="mx-auto hidden size-5 text-muted-foreground sm:block" />
                  <ArrowDown aria-hidden="true" className="mx-auto size-5 text-muted-foreground sm:hidden" />
                  <div className="rounded-2xl bg-secondary/75 p-4">
                    <p className="text-xs font-semibold text-primary">They list</p>
                    <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Min Spend</span><span className="font-semibold">$600</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Ask</span><span className="font-semibold">$500 <span className="text-primary">OBO</span></span>
                    </div>
                  </div>
                </div>
                <p className="mt-5 border-t border-border pt-5 text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6">
                  <strong className="font-semibold text-foreground">Own the Perk connects people.</strong>{" "}
                  It does not process the purchase between them or guarantee the credit card reward.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-[#f1f7f3]">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:px-8 lg:py-24">
            <div className="max-w-xl">
              <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary"><ShieldCheck aria-hidden="true" className="size-6" /></span>
              <h2 className="mt-5 text-3xl font-semibold tracking-[-0.045em] text-balance sm:text-5xl">Private by default. Trust built in.</h2>
              <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                Compare what matters without revealing who is behind a listing. Seller profiles stay anonymous until a buyer chooses to connect.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {trustItems.map(({ icon: Icon, label }, index) => (
                <div key={label} className={`flex min-h-20 items-center gap-3 rounded-2xl border border-border bg-card p-4 ${index === trustItems.length - 1 ? "sm:col-span-2" : ""}`}>
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><Icon aria-hidden="true" className="size-4.5" /></span>
                  <p className="text-sm font-medium leading-5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:py-28">
          <div className="text-center">
            <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">Simple fees</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-balance sm:text-5xl">Two small, one-time fees.</h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <article className="rounded-3xl border border-border bg-card p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <span className="grid size-11 place-items-center rounded-2xl bg-secondary text-primary"><Tag aria-hidden="true" className="size-5" /></span>
                <p className="text-3xl font-semibold tracking-[-0.04em] text-primary">$0.99</p>
              </div>
              <h3 className="mt-7 text-xl font-semibold tracking-[-0.025em]">List an offer</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Pay when submitting an offer listing.</p>
            </article>
            <article className="rounded-3xl border border-border bg-card p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <span className="grid size-11 place-items-center rounded-2xl bg-[#f8e6b6] text-[#76520f]"><MessageCircle aria-hidden="true" className="size-5" /></span>
                <p className="text-3xl font-semibold tracking-[-0.04em] text-primary">$1.99</p>
              </div>
              <h3 className="mt-7 text-xl font-semibold tracking-[-0.025em]">Unlock a connection</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Pay only when you choose a listing and want to connect.</p>
            </article>
          </div>
          <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
            These are fixed platform fees, not a commission on what people decide to do after connecting.
          </p>
        </section>

        <section className="px-4 pb-20 sm:px-6 lg:pb-28">
          <div className="mx-auto max-w-5xl rounded-[2rem] border border-primary/15 bg-secondary/70 px-6 py-12 text-center sm:px-10 sm:py-16">
            <h2 className="text-3xl font-semibold tracking-[-0.045em] text-balance sm:text-5xl">Turn unused card offers into useful connections.</h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">Search by the merchant you already plan to shop with.</p>
            <div className="mx-auto mt-8 flex max-w-md flex-col justify-center gap-3 sm:flex-row">
              <Link href="/search" className={buttonVariants({ size: "lg" })}>Find an Offer <ArrowRight aria-hidden="true" /></Link>
              <Link href="/offers/new" className={buttonVariants({ variant: "outline", size: "lg" })}>List My Offer</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <Brand />
          <p className="inline-flex items-center gap-1.5"><Check aria-hidden="true" className="size-3.5 text-primary" /> Find an offer. Compare the numbers. Connect privately.</p>
        </div>
      </footer>
    </div>
  );
}
