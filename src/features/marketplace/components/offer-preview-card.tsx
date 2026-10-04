import { BadgeCheck, Clock3, MessageCircle, Star } from "lucide-react";

type OfferPreviewCardProps = {
  merchant: string;
  spend: string;
  reward: string;
  expires: string;
  username: string;
  rating: string;
  interactions: number;
  tone?: "mint" | "sand" | "sky";
};

const tones = {
  mint: "bg-[#dcefe5] text-[#174f53]",
  sand: "bg-[#f3e7c7] text-[#62491d]",
  sky: "bg-[#dcebf0] text-[#244e5a]",
};

export function OfferPreviewCard({
  expires,
  interactions,
  merchant,
  rating,
  reward,
  spend,
  tone = "mint",
  username,
}: OfferPreviewCardProps) {
  return (
    <article className="group rounded-3xl border border-border bg-card p-4 shadow-[0_18px_55px_-42px_rgba(16,48,51,0.6)] transition-transform sm:p-5 lg:hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className={`grid size-11 shrink-0 place-items-center rounded-2xl text-base font-bold ${tones[tone]}`}
          >
            {merchant.slice(0, 1)}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">{merchant}</h2>
            <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-primary">
              <BadgeCheck aria-hidden="true" className="size-3.5" />
              Offer verified
            </span>
          </div>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
          Preview
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-muted/75 p-3">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Spend
          </p>
          <p className="mt-1 text-lg font-semibold tracking-[-0.03em]">{spend}</p>
        </div>
        <div className="rounded-2xl bg-secondary/70 p-3">
          <p className="text-[11px] font-medium tracking-wide text-primary/70 uppercase">
            Receive
          </p>
          <p className="mt-1 text-lg font-semibold tracking-[-0.03em] text-primary">
            {reward}
          </p>
        </div>
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock3 aria-hidden="true" className="size-3.5" />
        Expires {expires}
      </p>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4 text-xs">
        <span className="truncate font-semibold">{username}</span>
        <span className="flex shrink-0 items-center gap-3 text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Star aria-hidden="true" className="size-3.5 fill-current text-[#b98224]" />
            {rating}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle aria-hidden="true" className="size-3.5" />
            {interactions}
          </span>
        </span>
      </div>
    </article>
  );
}
