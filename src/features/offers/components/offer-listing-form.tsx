"use client";

import { FileLock2, Save, Send } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { initialFormState, type FormState } from "@/features/auth/types";
import type { CanonicalOfferDTO, MerchantDTO, OfferCardOptionDTO, PrivateOfferListingDTO } from "@/features/offers/types";

type ListingAction = (state: FormState, formData: FormData) => Promise<FormState>;
const inputClass = "min-h-12 w-full rounded-2xl border border-input bg-background px-4 text-base outline-none focus:border-primary focus:ring-2 focus:ring-ring/25";

function SubmitButtons() {
  const { pending } = useFormStatus();
  return <div className="flex flex-col gap-3 sm:flex-row">
    <Button type="submit" name="intent" value="draft" variant="outline" size="lg" disabled={pending}><Save aria-hidden="true" /> {pending ? "Saving…" : "Save draft"}</Button>
    <Button type="submit" name="intent" value="submit" size="lg" disabled={pending}><Send aria-hidden="true" /> {pending ? "Submitting…" : "Submit for verification"}</Button>
  </div>;
}

function ErrorText({ errors }: { errors?: string[] }) {
  return errors?.[0] ? <p className="text-xs font-medium text-red-700">{errors[0]}</p> : null;
}

function rewardLabel(offer: CanonicalOfferDTO) {
  if (offer.rewardType === "PERCENT_BACK") return offer.rewardAmount + "% back";
  if (offer.rewardType === "POINTS") return offer.rewardAmount.toLocaleString() + " points";
  return "$" + offer.rewardAmount.toLocaleString() + (offer.rewardType === "STATEMENT_CREDIT" ? " statement credit" : " back");
}

export function OfferListingForm({ action, cards, merchants, offers, listing }: {
  action: ListingAction;
  cards: OfferCardOptionDTO[];
  merchants: MerchantDTO[];
  offers: CanonicalOfferDTO[];
  listing?: PrivateOfferListingDTO;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const [merchantSearch, setMerchantSearch] = useState("");
  const [merchantId, setMerchantId] = useState(listing?.merchantId ?? "");
  const visibleMerchants = useMemo(() => {
    const query = merchantSearch.trim().toLowerCase();
    return query ? merchants.filter((merchant) => (merchant.name + " " + (merchant.category ?? "")).toLowerCase().includes(query)) : merchants;
  }, [merchantSearch, merchants]);
  const visibleOffers = offers.filter((offer) => offer.merchantId === merchantId);
  const selectedOfferId = listing && visibleOffers.some((offer) => offer.id === listing.offerId) ? listing.offerId : "";

  return <form action={formAction} className="space-y-6" noValidate>
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="space-y-2 text-sm font-semibold">Private card
        <select name="cardId" required defaultValue={listing?.cardId ?? ""} className={inputClass}>
          <option value="" disabled>Select a card</option>
          {cards.map((card) => <option key={card.id} value={card.id}>{card.nickname} · {card.issuer}</option>)}
        </select>
        <ErrorText errors={state.fieldErrors?.cardId} />
      </label>
      <div className="space-y-2">
        <label htmlFor="merchant-search" className="text-sm font-semibold">Merchant</label>
        <input id="merchant-search" type="search" value={merchantSearch} onChange={(event) => setMerchantSearch(event.target.value)} className={inputClass} placeholder="Search merchants" />
        <select aria-label="Selected merchant" value={merchantId} onChange={(event) => setMerchantId(event.target.value)} className={inputClass}>
          <option value="" disabled>Select a merchant</option>
          {visibleMerchants.map((merchant) => <option key={merchant.id} value={merchant.id}>{merchant.name}{merchant.category ? " · " + merchant.category : ""}</option>)}
        </select>
        {!visibleMerchants.length ? <p className="text-xs text-muted-foreground">Merchant not found? Request support will be added later.</p> : null}
      </div>
    </div>

    <label className="space-y-2 text-sm font-semibold">credit card offer
      <select key={merchantId} name="offerId" required defaultValue={selectedOfferId} className={inputClass}>
        <option value="" disabled>{merchantId ? "Select an offer" : "Select a merchant first"}</option>
        {visibleOffers.map((offer) => <option key={offer.id} value={offer.id}>{offer.title} · expires {offer.expirationDate}</option>)}
      </select>
      {merchantId && !visibleOffers.length ? <p className="text-xs font-normal text-muted-foreground">No current offer is available for this merchant. Canonical-offer requests will be added later.</p> : null}
      <ErrorText errors={state.fieldErrors?.offerId} />
    </label>

    {listing ? <div className="rounded-2xl bg-muted/70 p-4 text-sm text-muted-foreground">
      <p className="font-semibold text-foreground">{listing.title}</p>
      <p className="mt-1">Canonical terms: spend USD {listing.requiredSpend.toLocaleString()} · {rewardLabel({
        id: listing.offerId, merchantId: listing.merchantId, title: listing.title, description: listing.description,
        requiredSpend: listing.requiredSpend, rewardAmount: listing.rewardAmount, rewardType: listing.rewardType,
        expirationDate: listing.expirationDate, status: "ACTIVE",
      })}</p>
    </div> : null}

    <div className="grid gap-5 sm:grid-cols-2">
      <label className="space-y-2 text-sm font-semibold">Min spend
        <input name="minSpend" type="number" min="0" step="0.01" required defaultValue={listing?.minSpend} className={inputClass} />
        <ErrorText errors={state.fieldErrors?.minSpend} />
      </label>
      <label className="space-y-2 text-sm font-semibold">Ask amount
        <input name="askAmount" type="number" min="0" step="0.01" required defaultValue={listing?.askAmount ?? ""} className={inputClass} />
        <ErrorText errors={state.fieldErrors?.askAmount} />
      </label>
    </div>
    <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-input px-4 text-sm font-semibold">
      <input name="isObo" type="checkbox" defaultChecked={listing?.isObo} className="size-5 accent-primary" />
      Accept offers below my ask (OBO)
    </label>

    <div className="rounded-3xl border border-border bg-muted/55 p-5">
      <div className="flex items-start gap-3"><FileLock2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" /><div>
        <label htmlFor="evidence" className="text-sm font-semibold">Private verification evidence {listing?.evidence ? "(replace optional)" : "(optional for drafts)"}</label>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">PNG, JPEG, WebP, or PDF up to 5 MB. Original filenames are never stored. Evidence is required before submission.</p>
      </div></div>
      <input id="evidence" name="evidence" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" className="mt-4 block w-full text-sm file:mr-3 file:min-h-10 file:rounded-full file:border-0 file:bg-secondary file:px-4 file:font-semibold file:text-primary" />
      <ErrorText errors={state.fieldErrors?.evidence} />
    </div>
    {state.message ? <p role="alert" className={state.status === "error" ? "rounded-2xl bg-red-50 p-4 text-sm text-red-800" : "text-sm text-primary"}>{state.message}</p> : null}
    <SubmitButtons />
  </form>;
}
