import { CheckCircle2, CircleX, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { setInteractionStatusAction } from "../actions";

export function InteractionActions({ conversationId }: { conversationId: string }) {
  const options = [
    { status: "COMPLETED" as const, label: "Mark Completed", icon: CheckCircle2, primary: true },
    { status: "NO_AGREEMENT" as const, label: "No Agreement", icon: CircleX, primary: false },
    { status: "CLOSED" as const, label: "Close", icon: X, primary: false },
  ];
  return <section className="rounded-3xl border border-border bg-card p-4 sm:p-5">
    <h2 className="font-semibold">Interaction status</h2>
    <p className="mt-1 text-sm text-muted-foreground">Either participant can choose a final outcome. No transaction details are recorded.</p>
    <div className="mt-4 grid gap-2 sm:grid-cols-3">
      {options.map(({ status, label, icon: Icon, primary }) => {
        const action = setInteractionStatusAction.bind(null, conversationId, status);
        return <form key={status} action={action}><Button type="submit" variant={primary ? "default" : "outline"} className="w-full"><Icon aria-hidden="true" /> {label}</Button></form>;
      })}
    </div>
  </section>;
}
