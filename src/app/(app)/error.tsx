"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section role="alert" className="mx-auto max-w-xl rounded-3xl border border-red-200 bg-card p-6 text-center shadow-sm sm:p-8">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-red-50 text-red-700">
        <AlertTriangle aria-hidden="true" className="size-5" />
      </span>
      <h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em]">This screen couldn&apos;t load</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Check your connection and try again. Your account data has not been changed.
      </p>
      <Button type="button" className="mt-6" onClick={reset}>
        <RotateCcw aria-hidden="true" /> Try again
      </Button>
    </section>
  );
}
