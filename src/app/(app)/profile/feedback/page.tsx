import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { FeedbackForm } from "@/features/feedback/components/feedback-form";
import type { FeedbackType } from "@/features/feedback/types";

export const metadata: Metadata = { title: "Report a bug or send feedback" };

function safeSourcePath(value: string | undefined) {
  if (!value || !/^\/(?!\/)/.test(value)) return "/profile/feedback";
  return value.split(/[?#]/, 1)[0]?.slice(0, 500) || "/profile/feedback";
}

export default async function FeedbackPage({ searchParams }: {
  searchParams: Promise<{ type?: string; from?: string }>;
}) {
  const query = await searchParams;
  const defaultType: FeedbackType = query.type === "FEEDBACK" ? "FEEDBACK" : "BUG";

  return <div className="mx-auto max-w-3xl space-y-8">
    <PageHeader
      eyebrow="Help · one-way submission"
      title={defaultType === "BUG" ? "Report a bug" : "Send feedback"}
      description="Share an issue or suggestion with the team. Submissions do not create a support inbox or reply thread."
    />
    <FeedbackForm defaultType={defaultType} defaultPageUrl={safeSourcePath(query.from)} />
  </div>;
}

