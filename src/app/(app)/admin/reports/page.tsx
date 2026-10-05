import { ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { canCurrentUserModerate } from "@/features/admin/auth";
import { ReportCard } from "@/features/admin/components/report-card";
import { getModerationReports } from "@/features/admin/data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Moderation reports" };

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ action?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await canCurrentUserModerate(supabase, user.id))) notFound();
  const [reports, query] = await Promise.all([getModerationReports(supabase), searchParams]);
  return <div className="space-y-8">
    <PageHeader eyebrow="Admin · trust and safety" title="Report queue" description="Review user-submitted reports with limited marketplace context. Verification evidence and private messages are not shown here." />
    {query.action === "success" && <p className="rounded-2xl bg-secondary p-4 text-sm text-secondary-foreground">Moderation action saved and audit logged.</p>}
    {query.action === "error" && <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-800">The moderation action could not be completed.</p>}
    {reports.length ? <div className="space-y-5">{reports.map((report) => <ReportCard key={report.id} report={report} />)}</div> : <EmptyState icon={ShieldAlert} title="Report queue is clear" description="New private reports will appear here for moderators and administrators." />}
  </div>;
}
