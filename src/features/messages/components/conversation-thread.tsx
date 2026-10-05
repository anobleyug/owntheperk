"use client";

import { Send } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import { markConversationReadAction, sendMessageAction, type SendMessageState } from "../actions";
import type { MessageDTO } from "../types";

const initialState: SendMessageState = { status: "idle" };

function messageTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function ConversationThread({
  conversationId,
  currentUserId,
  initialMessages,
}: {
  conversationId: string;
  currentUserId: string;
  initialMessages: MessageDTO[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [content, setContent] = useState("");
  const [state, action, pending] = useActionState(sendMessageAction, initialState);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`conversation:${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const row = payload.new as {
          id: string; conversation_id: string; sender_id: string; content: string;
          created_at: string; read_at: string | null;
        };
        setMessages((current) => current.some((message) => message.id === row.id) ? current : [...current, {
          id: row.id,
          conversationId: row.conversation_id,
          senderId: row.sender_id,
          content: row.content,
          createdAt: row.created_at,
          readAt: row.read_at,
        }]);
        if (row.sender_id !== currentUserId) void markConversationReadAction(conversationId);
      }).subscribe();
    void markConversationReadAction(conversationId);
    return () => { void supabase.removeChannel(channel); };
  }, [conversationId, currentUserId]);

  useEffect(() => {
    if (state.status === "success") setContent("");
  }, [state.sentAt, state.status]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <section className="flex min-h-[55svh] flex-col rounded-3xl border border-border bg-card">
      <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6" aria-live="polite">
        {messages.length === 0 ? (
          <div className="grid min-h-64 place-items-center text-center">
            <div><p className="font-semibold">Start the conversation</p>
              <p className="mt-1 text-sm text-muted-foreground">Keep card credentials and private financial details out of chat.</p></div>
          </div>
        ) : messages.map((message) => {
          const mine = message.senderId === currentUserId;
          return <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%] rounded-2xl px-4 py-2.5 sm:max-w-[70%]", mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted")}>
              <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.content}</p>
              <p className={cn("mt-1 text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>{messageTime(message.createdAt)}</p>
            </div>
          </div>;
        })}
        <div ref={bottomRef} />
      </div>

      <form action={action} className="sticky bottom-20 border-t border-border bg-card p-3 sm:p-4 lg:bottom-0">
        <input type="hidden" name="conversationId" value={conversationId} />
        <div className="flex items-end gap-2">
          <label htmlFor="message-content" className="sr-only">Message</label>
          <textarea
            id="message-content"
            name="content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={1}
            maxLength={2000}
            placeholder="Write a message…"
            className="min-h-12 flex-1 resize-none rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <Button type="submit" size="icon" disabled={pending || !content.trim()} aria-label="Send message">
            <Send aria-hidden="true" />
          </Button>
        </div>
        {state.status === "error" && <p role="alert" className="mt-2 text-xs font-medium text-red-700">{state.message}</p>}
        <p className="mt-2 text-[11px] text-muted-foreground">Never share card numbers, CVVs, passwords, SSNs, or bank credentials.</p>
      </form>
    </section>
  );
}
