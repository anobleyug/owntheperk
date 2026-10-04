import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({
  action,
  description,
  icon: Icon,
  title,
}: EmptyStateProps) {
  return (
    <section className="rounded-3xl border border-dashed border-border bg-card px-5 py-12 text-center shadow-[0_18px_50px_-38px_rgba(20,50,55,0.45)] sm:px-8">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <h2 className="mt-5 text-lg font-semibold tracking-[-0.02em]">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </section>
  );
}
