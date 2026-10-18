"use client";

import { CheckCircle2, Send } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import { initialFormState } from "@/features/auth/types";
import { Button } from "@/components/ui/button";
import { submitFeedbackAction } from "../actions";
import {
  FEEDBACK_CATEGORIES,
  feedbackCategoryLabels,
  type FeedbackType,
} from "../types";

const inputClass = "min-h-12 w-full rounded-2xl border border-input bg-background px-4 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending}>
    <Send aria-hidden="true" /> {pending ? "Submitting…" : "Submit"}
  </Button>;
}

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.[0] ? <p className="text-xs font-medium text-red-700">{errors[0]}</p> : null;
}

export function FeedbackForm({ defaultType, defaultPageUrl }: {
  defaultType: FeedbackType;
  defaultPageUrl: string;
}) {
  const [state, formAction] = useActionState(submitFeedbackAction, initialFormState);
  const pageUrlRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (defaultPageUrl !== "/profile/feedback") return;
    try {
      const referrer = document.referrer ? new URL(document.referrer) : null;
      if (pageUrlRef.current && referrer?.origin === window.location.origin && referrer.pathname !== "/profile/feedback") {
        pageUrlRef.current.value = referrer.pathname;
      }
    } catch {
      // The server-provided app path remains the privacy-safe fallback.
    }
  }, [defaultPageUrl]);

  if (state.status === "success") {
    return <div role="status" className="rounded-3xl border border-border bg-card p-6 sm:p-8">
      <CheckCircle2 aria-hidden="true" className="size-8 text-primary" />
      <p className="mt-4 text-lg font-semibold">{state.message}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">This is a one-way submission. No support conversation or reply thread was created.</p>
    </div>;
  }

  return <form action={formAction} className="space-y-5 rounded-3xl border border-border bg-card p-5 sm:p-7" noValidate>
    <input ref={pageUrlRef} type="hidden" name="pageUrl" defaultValue={defaultPageUrl} />
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="space-y-2 text-sm font-semibold">Type
        <select name="type" defaultValue={defaultType} className={inputClass}>
          <option value="BUG">Report a bug</option>
          <option value="FEEDBACK">Send feedback</option>
        </select>
        <FieldError errors={state.fieldErrors?.type} />
      </label>
      <label className="space-y-2 text-sm font-semibold">Category <span className="font-normal text-muted-foreground">(optional)</span>
        <select name="category" defaultValue={defaultType === "BUG" ? "BUG" : ""} className={inputClass}>
          <option value="">Select a category</option>
          {FEEDBACK_CATEGORIES.map((category) => <option key={category} value={category}>{feedbackCategoryLabels[category]}</option>)}
        </select>
        <FieldError errors={state.fieldErrors?.category} />
      </label>
    </div>
    <label className="space-y-2 text-sm font-semibold">Subject
      <input name="subject" required maxLength={120} className={inputClass} placeholder="Brief summary" aria-invalid={Boolean(state.fieldErrors?.subject)} />
      <FieldError errors={state.fieldErrors?.subject} />
    </label>
    <label className="space-y-2 text-sm font-semibold">Message
      <textarea name="message" required maxLength={4000} rows={7} className={`${inputClass} min-h-44 resize-y py-3`} placeholder="Tell us what happened or what could be improved." aria-invalid={Boolean(state.fieldErrors?.message)} />
      <FieldError errors={state.fieldErrors?.message} />
    </label>
    <p className="rounded-2xl bg-muted/65 p-4 text-xs leading-5 text-muted-foreground">
      The app page and a limited browser identifier are included to help diagnose issues. Do not include passwords, card details, private messages, or verification evidence.
    </p>
    {state.message ? <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-800">{state.message}</p> : null}
    <SubmitButton />
  </form>;
}

