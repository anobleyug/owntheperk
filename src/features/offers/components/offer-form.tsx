"use client";

import { FileLock2, Save, Send } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { initialFormState, type FormState } from "@/features/auth/types";
import { REWARD_TYPES } from "@/features/offers/schema";
import type { MerchantDTO, OfferCardOptionDTO, PrivateOfferDTO } from "@/features/offers/types";

type OfferAction = (state: FormState, formData: FormData) => Promise<FormState>;

const inputClass =
  "min-h-12 w-full rounded-2xl border border-input bg-background px-4 text-base outline-none focus:border-primary focus:ring-2 focus:ring-ring/25";

const rewardLabels: Record<(typeof REWARD_TYPES)[number], string> = {
  STATEMENT_CREDIT: "Statement credit",
  CASH_BACK: "Cash back",
  PERCENT_BACK: "Percent back",
  POINTS: "Points",
  OTHER: "Other",
};

function SubmitButtons() {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button type="submit" name="intent" value="draft" variant="outline" size="lg" disabled={pending}>
        <Save aria-hidden="true" /> {pending ? "Saving…" : "Save draft"}
      </Button>
      <Button type="submit" name="intent" value="submit" size="lg" disabled={pending}>
        <Send aria-hidden="true" /> {pending ? "Submitting…" : "Submit for verification"}
      </Button>
    </div>
  );
}

function ErrorText({ errors }: { errors?: string[] }) {
  return errors?.[0] ? <p className="text-xs font-medium text-red-700">{errors[0]}</p> : null;
}

export function OfferForm({
  action,
  cards,
  merchants,
  offer,
}: {
  action: OfferAction;
  cards: OfferCardOptionDTO[];
  merchants: MerchantDTO[];
  offer?: PrivateOfferDTO;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const [merchantSearch, setMerchantSearch] = useState("");
  const visibleMerchants = useMemo(() => {
    const query = merchantSearch.trim().toLowerCase();
    return query
      ? merchants.filter((merchant) =>
          `${merchant.name} ${merchant.category ?? ""}`.toLowerCase().includes(query),
        )
      : merchants;
  }, [merchantSearch, merchants]);

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-semibold">
          Private card
          <select name="cardId" required defaultValue={offer?.cardId ?? ""} className={inputClass}>
            <option value="" disabled>Select a card</option>
            {cards.map((card) => (
              <option key={card.id} value={card.id}>{card.nickname} · {card.issuer}</option>
            ))}
          </select>
          <ErrorText errors={state.fieldErrors?.cardId} />
        </label>

        <div className="space-y-2">
          <label htmlFor="merchant-search" className="text-sm font-semibold">Merchant</label>
          <input
            id="merchant-search"
            type="search"
            value={merchantSearch}
            onChange={(event) => setMerchantSearch(event.target.value)}
            className={inputClass}
            placeholder="Search merchants"
          />
          <select name="merchantId" required defaultValue={offer?.merchantId ?? ""} className={inputClass}>
            <option value="" disabled>Select a merchant</option>
            {visibleMerchants.map((merchant) => (
              <option key={merchant.id} value={merchant.id}>
                {merchant.name}{merchant.category ? ` · ${merchant.category}` : ""}
              </option>
            ))}
          </select>
          {!visibleMerchants.length ? (
            <p className="text-xs text-muted-foreground">Merchant not found? Request merchant support will be added later.</p>
          ) : null}
          <ErrorText errors={state.fieldErrors?.merchantId} />
        </div>
      </div>

      <label className="space-y-2 text-sm font-semibold">
        Offer title
        <input
          name="title"
          required
          minLength={5}
          maxLength={140}
          defaultValue={offer?.title}
          className={inputClass}
          placeholder="$250 statement credit after $600 spend"
        />
        <ErrorText errors={state.fieldErrors?.title} />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-semibold">
          Spend requirement
          <input name="spendRequirement" type="number" min="0" step="0.01" required defaultValue={offer?.spendRequirement} className={inputClass} />
          <ErrorText errors={state.fieldErrors?.spendRequirement} />
        </label>
        <label className="space-y-2 text-sm font-semibold">
          Reward amount
          <input name="rewardAmount" type="number" min="0" step="0.01" required defaultValue={offer?.rewardAmount} className={inputClass} />
          <ErrorText errors={state.fieldErrors?.rewardAmount} />
        </label>
        <label className="space-y-2 text-sm font-semibold">
          Reward type
          <select name="rewardType" required defaultValue={offer?.rewardType ?? "STATEMENT_CREDIT"} className={inputClass}>
            {REWARD_TYPES.map((type) => <option key={type} value={type}>{rewardLabels[type]}</option>)}
          </select>
          <ErrorText errors={state.fieldErrors?.rewardType} />
        </label>
        <label className="space-y-2 text-sm font-semibold">
          Expiration date
          <input name="expirationDate" type="date" required defaultValue={offer?.expirationDate} className={inputClass} />
          <ErrorText errors={state.fieldErrors?.expirationDate} />
        </label>
      </div>

      <label className="space-y-2 text-sm font-semibold">
        Description <span className="font-normal text-muted-foreground">(optional)</span>
        <textarea name="description" rows={5} maxLength={1200} defaultValue={offer?.description} className={`${inputClass} resize-y py-3`} />
        <ErrorText errors={state.fieldErrors?.description} />
      </label>

      <div className="rounded-3xl border border-border bg-muted/55 p-5">
        <div className="flex items-start gap-3">
          <FileLock2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <label htmlFor="evidence" className="text-sm font-semibold">
              Private verification evidence {offer?.evidence ? "(replace optional)" : "(optional for drafts)"}
            </label>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              PNG, JPEG, WebP, or PDF up to 5 MB. Original filenames are never stored. Evidence is required before submission.
            </p>
          </div>
        </div>
        <input
          id="evidence"
          name="evidence"
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          className="mt-4 block w-full text-sm file:mr-3 file:min-h-10 file:rounded-full file:border-0 file:bg-secondary file:px-4 file:font-semibold file:text-primary"
        />
        <ErrorText errors={state.fieldErrors?.evidence} />
      </div>

      {state.message ? (
        <p role="alert" className={state.status === "error" ? "rounded-2xl bg-red-50 p-4 text-sm text-red-800" : "text-sm text-primary"}>
          {state.message}
        </p>
      ) : null}
      <SubmitButtons />
    </form>
  );
}
