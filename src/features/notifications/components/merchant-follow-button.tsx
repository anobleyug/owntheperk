"use client";

import { Bell, BellOff } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { setMerchantFollowAction } from "../actions";

export function MerchantFollowButton({ merchantId, merchantName, initiallyFollowing }: {
  merchantId: string;
  merchantName: string;
  initiallyFollowing: boolean;
}) {
  const [state, action, pending] = useActionState(setMerchantFollowAction, {
    status: "idle" as const,
    following: initiallyFollowing,
  });
  return <div>
    <form action={action}>
      <input type="hidden" name="merchantId" value={merchantId} />
      <input type="hidden" name="intent" value={state.following ? "unfollow" : "follow"} />
      <Button type="submit" variant="outline" disabled={pending} aria-label={`${state.following ? "Stop following" : "Follow"} ${merchantName}`}>
        {state.following ? <BellOff aria-hidden="true" /> : <Bell aria-hidden="true" />}
        {pending ? "Saving…" : state.following ? "Following merchant" : "Follow merchant"}
      </Button>
    </form>
    {state.message && <p role={state.status === "error" ? "alert" : "status"} className={state.status === "error" ? "mt-2 text-xs text-red-700" : "mt-2 text-xs text-muted-foreground"}>{state.message}</p>}
  </div>;
}
