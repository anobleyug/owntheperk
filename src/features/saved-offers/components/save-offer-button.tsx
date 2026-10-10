"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { useActionState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { setSavedOfferAction } from "../actions";

export function SaveOfferButton({ offerId, initiallySaved, compact = false }: {
  offerId: string;
  initiallySaved: boolean;
  compact?: boolean;
}) {
  const queryClient = useQueryClient();
  const [state, action, pending] = useActionState(setSavedOfferAction, {
    status: "idle" as const,
    saved: initiallySaved,
  });

  useEffect(() => {
    if (state.status !== "success") return;
    queryClient.setQueryData<string[]>(["saved-offer-ids"], (current = []) => state.saved
      ? Array.from(new Set([...current, offerId]))
      : current.filter((id) => id !== offerId));
  }, [offerId, queryClient, state.saved, state.status]);

  return <div className={compact ? "" : "min-w-fit"}>
    <form action={action}>
      <input type="hidden" name="offerId" value={offerId} />
      <input type="hidden" name="intent" value={state.saved ? "unsave" : "save"} />
      <Button
        type="submit"
        variant="outline"
        size={compact ? "sm" : "default"}
        disabled={pending}
        aria-pressed={state.saved}
        aria-label={state.saved ? "Remove saved offer" : "Save offer"}
      >
        {state.saved ? <BookmarkCheck aria-hidden="true" className="fill-current" /> : <Bookmark aria-hidden="true" />}
        {pending ? "Saving…" : state.saved ? "Saved" : "Save"}
      </Button>
    </form>
    {!compact && state.status === "error" && <p role="alert" className="mt-2 text-xs text-red-700">{state.message}</p>}
  </div>;
}
