import {
  BadgeCheck,
  Ban,
  CreditCard,
  EyeOff,
  Flag,
  LockKeyhole,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Brand } from "@/components/brand";
import { MarketingHeader } from "@/components/marketing-header";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Trust & Safety",
  description: "Learn how offer verification, marketplace privacy, reporting, and blocking work on Own the Perk.",
};

const neverShare = [
  "Full card number",
  "CVV or PIN",
  "Issuer login credentials",
  "Passwords",
  "Bank credentials",
  "Social Security number",
  "Verification codes",
];

const prohibited = [
  "Fake offers or stolen cards",
  "Credential sharing or requests",
  "Scams or chargeback abuse",
  "Harassment or spam",
  "Misleading listings",
  "Attempts to bypass platform safety controls",
];

export default function TrustSafetyPage() {
  return <div className="min-h-svh bg-background">
    <MarketingHeader />
    <main>
      <section className="border-b border-border bg-[radial-gradient(circle_at_50%_0%,rgba(176,222,203,0.55),transparent_72%)]">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
            <ShieldCheck aria-hidden="true" className="size-6" />
          </span>
          <p className="mt-6 text-xs font-semibold tracking-[0.16em] text-primary uppercase">Trust & Safety Center</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-balance sm:text-6xl">Connect carefully. Keep private information private.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Own the Perk gives you verification, reputation, reporting, and blocking tools while keeping the marketplace anonymous by default.
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-5xl gap-5 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-2 lg:px-8">
        <section className="rounded-3xl border border-border bg-card p-5 sm:p-7">
          <span className="grid size-10 place-items-center rounded-2xl bg-secondary text-primary"><BadgeCheck aria-hidden="true" className="size-5" /></span>
          <h2 className="mt-5 text-xl font-semibold tracking-[-0.025em]">How Offer Verification Works</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Evidence is reviewed before a listing is published. “Offer Verified” means evidence of the offer was provided at the time of review.</p>
          <p className="mt-3 rounded-2xl bg-[#fff5d9] p-4 text-sm font-medium leading-6 text-[#6b4a0f]">Verification does not guarantee that a future purchase will qualify or that a card reward will be received.</p>
        </section>

        <section className="rounded-3xl border border-border bg-card p-5 sm:p-7">
          <span className="grid size-10 place-items-center rounded-2xl bg-secondary text-primary"><EyeOff aria-hidden="true" className="size-5" /></span>
          <h2 className="mt-5 text-xl font-semibold tracking-[-0.025em]">Anonymous Marketplace Identity</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">A seller’s identity is hidden before chat unlock. After a legitimate unlock, participants see only each other’s anonymous marketplace username and avatar.</p>
          <p className="mt-3 text-sm font-medium leading-6">Legal identity, private card information, and verification evidence are never public.</p>
        </section>

        <section className="rounded-3xl border border-red-200 bg-red-50 p-5 sm:p-7">
          <span className="grid size-10 place-items-center rounded-2xl bg-red-100 text-red-700"><TriangleAlert aria-hidden="true" className="size-5" /></span>
          <h2 className="mt-5 text-xl font-semibold tracking-[-0.025em] text-red-950">Never Share</h2>
          <p className="mt-2 text-sm leading-6 text-red-900/75">No legitimate connection requires these details:</p>
          <ul className="mt-4 grid gap-2 text-sm font-medium text-red-950 sm:grid-cols-2">
            {neverShare.map((item) => <li key={item} className="flex items-center gap-2"><LockKeyhole aria-hidden="true" className="size-4 shrink-0 text-red-700" />{item}</li>)}
          </ul>
        </section>

        <section className="rounded-3xl border border-border bg-card p-5 sm:p-7">
          <span className="grid size-10 place-items-center rounded-2xl bg-muted text-foreground"><Ban aria-hidden="true" className="size-5" /></span>
          <h2 className="mt-5 text-xl font-semibold tracking-[-0.025em]">Prohibited Behavior</h2>
          <ul className="mt-4 grid gap-2.5 text-sm leading-6 text-muted-foreground">
            {prohibited.map((item) => <li key={item} className="flex items-start gap-2"><ShieldAlert aria-hidden="true" className="mt-1 size-4 shrink-0 text-primary" />{item}</li>)}
          </ul>
        </section>

        <section className="rounded-3xl border border-border bg-card p-5 sm:p-7 lg:col-span-2">
          <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
            <span className="grid size-10 place-items-center rounded-2xl bg-secondary text-primary"><Flag aria-hidden="true" className="size-5" /></span>
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.025em]">Reporting & Blocking</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div><p className="text-sm font-semibold">Report</p><p className="mt-1 text-sm leading-6 text-muted-foreground">Use Report on a listing or conversation. For a message concern, report from that conversation and describe the relevant message.</p></div>
                <div><p className="text-sm font-semibold">Block</p><p className="mt-1 text-sm leading-6 text-muted-foreground">Blocking prevents new chats and messages between the two members. Existing conversation history remains available.</p></div>
                <div><p className="text-sm font-semibold">Moderation review</p><p className="mt-1 text-sm leading-6 text-muted-foreground">Reports are submitted privately. Moderators may review relevant listing, conversation, or message content when necessary and take appropriate action.</p></div>
              </div>
              <div className="mt-5 flex flex-col gap-2 min-[420px]:flex-row">
                <Link href="/search" className={buttonVariants()}>Browse listings</Link>
                <Link href="/messages" className={buttonVariants({ variant: "outline" })}>Open conversations</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl bg-brand-ink p-6 text-primary-foreground sm:p-8 lg:col-span-2">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/10"><CreditCard aria-hidden="true" className="size-5" /></span>
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-[#a8d8cb] uppercase">Marketplace Boundary</p>
              <p className="mt-3 text-lg font-semibold leading-7 sm:text-xl">
                Own the Perk helps users discover verified listings and connect. It does not process the underlying purchase, transfer card rewards, guarantee statement credits, or handle user-to-user payments.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>

    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <Brand />
        <p>Verification supports informed decisions. You decide who to trust.</p>
      </div>
    </footer>
  </div>;
}

