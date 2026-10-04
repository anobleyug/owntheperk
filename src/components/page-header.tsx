import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
};

export function PageHeader({
  action,
  description,
  eyebrow,
  title,
}: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-primary uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-balance sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
          {description}
        </p>
      </div>
      {action}
    </header>
  );
}
