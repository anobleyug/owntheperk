"use client";

import { Flag, ShieldBan } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { blockUserAction, submitReportAction } from "../actions";
import { REPORT_REASONS, type TrustActionState } from "../types";

const initialState: TrustActionState = { status: "idle" };
const reasonLabels = {
  FAKE_OFFER: "Fake offer",
  SCAM_ATTEMPT: "Scam attempt",
  HARASSMENT: "Harassment",
  SPAM: "Spam",
  CREDENTIAL_REQUEST: "Credential request",
  STOLEN_CARD_BEHAVIOR: "Stolen card behavior",
  MISLEADING_LISTING: "Misleading listing",
  OTHER: "Other",
} as const;

export function SafetyActions({
  targetUserId,
  conversationId,
  offerListingId,
  initiallyBlocked = false,
}: {
  targetUserId: string;
  conversationId?: string;
  offerListingId?: string;
  initiallyBlocked?: boolean;
}) {
  const [blockState, blockAction, blocking] = useActionState(blockUserAction, initialState);
  const [reportState, reportAction, reporting] = useActionState(submitReportAction, initialState);
  const blocked = initiallyBlocked || blockState.status === "success";
  const canReport = Boolean(conversationId || offerListingId);
  return <section className="rounded-3xl border border-border bg-card p-4 sm:p-5">
    <h2 className="font-semibold">Safety</h2>
    <div className="mt-3 flex flex-wrap gap-2">
      <form action={blockAction}>
        <input type="hidden" name="targetUserId" value={targetUserId} />
        <Button type="submit" variant="outline" disabled={blocking || blocked}><ShieldBan aria-hidden="true" /> {blocked ? "Blocked" : blocking ? "Blocking…" : "Block User"}</Button>
      </form>
      {canReport && <details className="w-full rounded-2xl border border-border p-3 sm:w-auto sm:min-w-80">
        <summary className="flex min-h-8 cursor-pointer list-none items-center gap-2 text-sm font-semibold"><Flag aria-hidden="true" className="size-4" /> Report</summary>
        <form action={reportAction} className="mt-4 space-y-3">
          <input type="hidden" name="reportedUserId" value={targetUserId} />
          <input type="hidden" name="conversationId" value={conversationId ?? ""} />
          <input type="hidden" name="offerListingId" value={offerListingId ?? ""} />
          <label className="grid gap-1.5 text-xs font-semibold"><span>Reason</span>
            <select name="reason" className="min-h-11 rounded-xl border border-input bg-background px-3 text-sm font-normal">
              {REPORT_REASONS.map((reason) => <option key={reason} value={reason}>{reasonLabels[reason]}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold"><span>What happened?</span>
            <textarea name="description" required minLength={10} maxLength={1000} rows={4} className="resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm font-normal" placeholder="Provide concise context for the moderation team." />
          </label>
          {reportState.message && <p role={reportState.status === "error" ? "alert" : "status"} className={reportState.status === "error" ? "text-xs font-medium text-red-700" : "text-xs font-medium text-primary"}>{reportState.message}</p>}
          <Button type="submit" size="sm" disabled={reporting || reportState.status === "success"}>{reporting ? "Submitting…" : "Submit report"}</Button>
        </form>
      </details>}
    </div>
    {blockState.message && <p role={blockState.status === "error" ? "alert" : "status"} className={blockState.status === "error" ? "mt-3 text-xs font-medium text-red-700" : "mt-3 text-xs text-muted-foreground"}>{blockState.message}</p>}
  </section>;
}
