import { MessageSquareWarning } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { canCurrentUserModerate } from "@/features/admin/auth";
import { FeedbackCard } from "@/features/admin/components/feedback-card";
import { getFeedbackSubmissions } from "@/features/admin/data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Bug reports and feedback" };

export default async function AdminFeedbackPage({ searchParams }: {
  searchParams: Promise<{ action?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await canCurrentUserModerate(supabase, user.id))) notFound();

  const [submissions, query] = await Promise.all([
    getFeedbackSubmissions(supabase),
    searchParams,
  ]);

  return <div className="space-y-8">
    <PageHeader
      eyebrow="Admin · product feedback"
      title="Bug reports and feedback"
      description="Review one-way user submissions and update their status. This queue has no reply or conversation controls."
    />
    {query.action === "success" ? <p className="rounded-2xl bg-secondary p-4 text-sm text-secondary-foreground">Feedback status updated.</p> : null}
    {query.action === "error" ? <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-800">The feedback status could not be updated.</p> : null}
    {submissions.length ? <div className="space-y-5">{submissions.map((submission) => <FeedbackCard key={submission.id} submission={submission} />)}</div> :
      <EmptyState icon={MessageSquareWarning} title="No feedback yet" description="New bug reports and product feedback will appear here." />}
  </div>;
}

