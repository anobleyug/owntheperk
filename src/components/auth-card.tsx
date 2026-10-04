import type { ReactNode } from "react";

import { Brand } from "@/components/brand";

export function AuthCard({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="paper-grid grid min-h-svh place-items-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-md">
        <Brand className="mb-8 justify-center" />
        <section className="rounded-3xl border border-border bg-card p-5 shadow-[0_30px_80px_-55px_rgba(12,55,58,0.6)] sm:p-8">
          <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em]">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
          <div className="mt-7">{children}</div>
        </section>
        {footer ? (
          <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
        ) : null}
      </div>
    </main>
  );
}
