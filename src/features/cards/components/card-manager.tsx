"use client";

import { CreditCard, Plus, Save } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { initialFormState } from "@/features/auth/types";
import { createCardAction, updateCardAction } from "@/features/cards/actions";
import type { PrivateCardDTO } from "@/features/cards/types";

const inputClass =
  "min-h-11 w-full rounded-2xl border border-input bg-background px-3.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/25";

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : children}
    </Button>
  );
}

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.[0] ? <p className="text-xs font-medium text-red-700">{errors[0]}</p> : null;
}

export function AddCardForm() {
  const [state, action] = useActionState(createCardAction, initialFormState);
  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-semibold">
          Issuer
          <input name="issuer" required maxLength={64} className={inputClass} placeholder="e.g. Amex" />
          <FieldError errors={state.fieldErrors?.issuer} />
        </label>
        <label className="space-y-2 text-sm font-semibold">
          Private nickname
          <input name="nickname" required maxLength={64} className={inputClass} placeholder="Business Card" />
          <FieldError errors={state.fieldErrors?.nickname} />
        </label>
        <label className="space-y-2 text-sm font-semibold">
          Card type <span className="font-normal text-muted-foreground">(optional)</span>
          <input name="cardType" maxLength={64} className={inputClass} placeholder="Business" />
          <FieldError errors={state.fieldErrors?.cardType} />
        </label>
        <label className="space-y-2 text-sm font-semibold">
          Last four <span className="font-normal text-muted-foreground">(optional)</span>
          <input
            name="last4"
            inputMode="numeric"
            pattern="[0-9]{4}"
            maxLength={4}
            className={inputClass}
            placeholder="1234"
            autoComplete="off"
          />
          <FieldError errors={state.fieldErrors?.last4} />
        </label>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        Never enter a full card number, security code, PIN, or issuer login. These fields
        are visible only in your private dashboard.
      </p>
      {state.message ? (
        <p role="status" className={state.status === "error" ? "text-sm text-red-700" : "text-sm text-primary"}>
          {state.message}
        </p>
      ) : null}
      <SubmitButton>
        <Plus aria-hidden="true" /> Add private card
      </SubmitButton>
    </form>
  );
}

function CardEditor({ card }: { card: PrivateCardDTO }) {
  const boundAction = updateCardAction.bind(null, card.id);
  const [state, action] = useActionState(boundAction, initialFormState);

  return (
    <form
      action={action}
      className="rounded-3xl border border-border bg-card p-5"
      onSubmit={(event) => {
        const form = event.currentTarget;
        const selectedStatus = new FormData(form).get("status");
        if (
          selectedStatus === "REMOVED" &&
          !window.confirm(
            card.offerCount
              ? `Remove this private card profile? Its ${card.offerCount} offer record(s) will be preserved.`
              : "Remove this private card profile?",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="confirmRemoval" value="yes" />
      <div className="mb-5 flex items-start justify-between gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-secondary text-primary">
          <CreditCard aria-hidden="true" className="size-5" />
        </span>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
          {card.offerCount} {card.offerCount === 1 ? "offer" : "offers"}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5 text-xs font-semibold">
          Issuer
          <input name="issuer" required maxLength={64} defaultValue={card.issuer} className={inputClass} />
        </label>
        <label className="space-y-1.5 text-xs font-semibold">
          Private nickname
          <input name="nickname" required maxLength={64} defaultValue={card.nickname} className={inputClass} />
        </label>
        <label className="space-y-1.5 text-xs font-semibold">
          Card type
          <input name="cardType" maxLength={64} defaultValue={card.cardType ?? ""} className={inputClass} />
        </label>
        <label className="space-y-1.5 text-xs font-semibold">
          Last four
          <input
            name="last4"
            inputMode="numeric"
            pattern="[0-9]{4}"
            maxLength={4}
            autoComplete="off"
            defaultValue={card.last4 ?? ""}
            className={inputClass}
          />
        </label>
        <label className="space-y-1.5 text-xs font-semibold sm:col-span-2">
          Status
          <select name="status" defaultValue={card.status} className={inputClass}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="REMOVED">Remove profile</option>
          </select>
        </label>
      </div>
      {state.message ? (
        <p role="status" className={`mt-4 text-sm ${state.status === "error" ? "text-red-700" : "text-primary"}`}>
          {state.message}
        </p>
      ) : null}
      <SubmitButton>
        <Save aria-hidden="true" /> Save card
      </SubmitButton>
    </form>
  );
}

export function CardList({ cards }: { cards: PrivateCardDTO[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {cards.map((card) => (
        <CardEditor key={card.id} card={card} />
      ))}
    </div>
  );
}
