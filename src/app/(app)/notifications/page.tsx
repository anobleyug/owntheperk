import { BadgeCheck, Bell, Flag, MessageSquareText, Star, Store } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { markAllNotificationsReadAction, openNotificationAction } from "@/features/notifications/actions";
import { getNotifications, notificationDestination } from "@/features/notifications/data";
import type { NotificationType } from "@/features/notifications/types";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifications" };

const typeIcons: Record<NotificationType, typeof Bell> = {
  NEW_MESSAGE: MessageSquareText,
  CHAT_UNLOCKED: MessageSquareText,
  LISTING_APPROVED: BadgeCheck,
  LISTING_REJECTED: Store,
  NEW_RATING: Star,
  MERCHANT_LISTING: Store,
  REPORT_RESOLVED: Flag,
  REPORT_DISMISSED: Flag,
};

export default async function NotificationsPage() {
  const supabase = await createClient();
  const notifications = await getNotifications(supabase);
  const hasUnread = notifications.some((notification) => !notification.readAt);
  return <div className="space-y-8">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <PageHeader eyebrow="In-app activity" title="Notifications" description="Messages, listing decisions, ratings, moderation outcomes, and alerts from merchants you follow." />
      {hasUnread && <form action={markAllNotificationsReadAction}><Button type="submit" variant="outline" className="w-full sm:w-auto">Mark all read</Button></form>}
    </div>
    {notifications.length === 0 ? <EmptyState icon={Bell} title="No notifications yet" description="Marketplace activity and saved merchant alerts will appear here." /> : <div className="space-y-3">{notifications.map((notification) => {
      const Icon = typeIcons[notification.type];
      const destination = notificationDestination(notification);
      const openAction = openNotificationAction.bind(null, notification.id);
      return <article key={notification.id} className={cn("flex gap-3 rounded-3xl border bg-card p-4 sm:items-center sm:p-5", notification.readAt ? "border-border" : "border-primary/30 bg-secondary/25")}>
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-2xl", notification.readAt ? "bg-muted text-muted-foreground" : "bg-secondary text-primary")}><Icon aria-hidden="true" className="size-4.5" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{notification.title}</h2>{!notification.readAt && <span className="size-2 rounded-full bg-primary" aria-label="Unread" />}</div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{notification.body}</p>
          <p className="mt-1 text-xs text-muted-foreground">{new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(notification.createdAt))}</p>
        </div>
        <form action={openAction} className="self-center"><Button type="submit" variant="outline" size="sm">{destination ? "View" : notification.readAt ? "Read" : "Mark read"}</Button></form>
      </article>;
    })}</div>}
  </div>;
}
