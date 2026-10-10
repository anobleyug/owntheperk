"use client";

import { Pause, Play } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { setOfferListingAvailabilityAction } from "../actions";

export function ListingAvailabilityButton({ listingId, listingStatus, canResume = true }: {
  listingId: string;
  listingStatus: "ACTIVE" | "PAUSED";
  canResume?: boolean;
}) {
  const [state, action, pending] = useActionState(setOfferListingAvailabilityAction.bind(null, listingId), {
    status: "idle" as const,
    listingStatus,
  });
  const paused = state.listingStatus === "PAUSED";
  return <div>
    <form action={action}>
      <input type="hidden" name="intent" value={paused ? "resume" : "pause"} />
      <Button type="submit" variant="outline" disabled={pending || (paused && !canResume)}>
        {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
        {pending ? "Updating…" : paused ? "Resume Listing" : "Pause Listing"}
      </Button>
    </form>
    {state.message ? <p role={state.status === "error" ? "alert" : "status"} className={state.status === "error" ? "mt-2 text-xs text-red-700" : "mt-2 text-xs text-muted-foreground"}>{state.message}</p> : null}
  </div>;
}
