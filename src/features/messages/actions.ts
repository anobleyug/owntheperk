"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { containsSensitiveContent } from "./sensitive-content";

export type SendMessageState = {
  status: "idle" | "success" | "error";
  message?: string;
  sentAt?: number;
};

const messageSchema = z.object({
  conversationId: z.uuid(),
  content: z.string().trim().min(1, "Write a message first.").max(2000, "Messages must be 2,000 characters or fewer."),
});

export async function sendMessageAction(
  _state: SendMessageState,
  formData: FormData,
): Promise<SendMessageState> {
  const parsed = messageSchema.safeParse({
    conversationId: formData.get("conversationId"),
    content: formData.get("content"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid message." };
  }
  if (containsSensitiveContent(parsed.data.content)) {
    return {
      status: "error",
      message: "For your safety, do not send card numbers, CVVs, SSNs, passwords, logins, or bank credentials.",
    };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in to send messages." };

  const { error } = await supabase.from("messages").insert({
    conversation_id: parsed.data.conversationId,
    sender_id: user.id,
    content: parsed.data.content,
  });
  if (error) return { status: "error", message: "This message could not be sent." };

  revalidatePath(`/messages/${parsed.data.conversationId}`);
  revalidatePath("/messages");
  return { status: "success", sentAt: Date.now() };
}

export async function markConversationReadAction(conversationId: string) {
  if (!z.uuid().safeParse(conversationId).success) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("messages").update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId).neq("sender_id", user.id).is("read_at", null);
  revalidatePath("/messages");
}
