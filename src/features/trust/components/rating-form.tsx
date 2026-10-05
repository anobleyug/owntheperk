"use client";

import { Star } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { submitRatingAction } from "../actions";
import type { TrustActionState } from "../types";

const initialState: TrustActionState = { status: "idle" };

function ScoreField({ name, label }: { name: string; label: string }) {
  return <label className="grid gap-1.5 text-sm font-medium">
    <span>{label}</span>
    <select name={name} defaultValue="5" className="min-h-11 rounded-xl border border-input bg-background px-3 text-sm">
      {[5, 4, 3, 2, 1].map((score) => <option key={score} value={score}>{score} — {score === 5 ? "Excellent" : score === 4 ? "Good" : score === 3 ? "Okay" : score === 2 ? "Poor" : "Very poor"}</option>)}
    </select>
  </label>;
}

export function RatingForm({ conversationId, otherUsername }: { conversationId: string; otherUsername: string }) {
  const [state, action, pending] = useActionState(submitRatingAction, initialState);
  if (state.status === "success") {
    return <section className="rounded-3xl border border-border bg-secondary/60 p-5" role="status">
      <p className="inline-flex items-center gap-2 font-semibold text-primary"><Star aria-hidden="true" className="size-4 fill-current" /> Rating submitted</p>
      <p className="mt-1 text-sm text-muted-foreground">{state.message}</p>
    </section>;
  }
  return <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
    <h2 className="text-lg font-semibold">Rate {otherUsername}</h2>
    <p className="mt-1 text-sm text-muted-foreground">Share marketplace-focused feedback. Ratings are final after submission.</p>
    <form action={action} className="mt-5 space-y-4">
      <input type="hidden" name="conversationId" value={conversationId} />
      <div className="grid grid-cols-2 gap-3">
        <ScoreField name="overallScore" label="Overall" />
        <ScoreField name="communicationScore" label="Communication" />
        <ScoreField name="reliabilityScore" label="Reliability" />
        <ScoreField name="accuracyScore" label="Listing accuracy" />
      </div>
      <label className="grid gap-1.5 text-sm font-medium">
        <span>Short review <span className="font-normal text-muted-foreground">(optional)</span></span>
        <textarea name="reviewText" maxLength={500} rows={3} className="resize-none rounded-2xl border border-input bg-background px-4 py-3 text-sm" placeholder="Keep the review factual and avoid private conversation details." />
      </label>
      {state.status === "error" && <p role="alert" className="text-sm font-medium text-red-700">{state.message}</p>}
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">{pending ? "Submitting…" : "Submit final rating"}</Button>
    </form>
  </section>;
}
