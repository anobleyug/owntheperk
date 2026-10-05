"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { FormState } from "@/features/auth/types";
import { createClient } from "@/lib/supabase/server";

import { cardFormSchema, cardUpdateSchema } from "./schema";

function cardValues(formData: FormData) {
  return {
    issuer: formData.get("issuer"),
    nickname: formData.get("nickname"),
    cardType: formData.get("cardType"),
    last4: formData.get("last4"),
  };
}

async function authenticatedClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function createCardAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = cardFormSchema.safeParse(cardValues(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the card details and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { supabase, user } = await authenticatedClient();
  const { error } = await supabase.from("credit_card_profiles").insert({
    user_id: user.id,
    issuer: parsed.data.issuer,
    nickname: parsed.data.nickname,
    card_type_optional: parsed.data.cardType || null,
    last4_optional: parsed.data.last4 || null,
  });

  if (error) return { status: "error", message: "Unable to add that card profile." };

  revalidatePath("/offers/cards");
  revalidatePath("/offers/new");
  return { status: "success", message: "Private card profile added." };
}

export async function updateCardAction(
  cardId: string,
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = cardUpdateSchema.safeParse({
    ...cardValues(formData),
    cardId,
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the card details and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { supabase, user } = await authenticatedClient();

  if (parsed.data.status === "REMOVED") {
    const { count } = await supabase
      .from("offer_listings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("card_id", cardId);
    if ((count ?? 0) > 0 && formData.get("confirmRemoval") !== "yes") {
      return {
        status: "error",
        message: "This card has listings. Confirm removal to keep those records intact.",
      };
    }
  }

  const { error } = await supabase
    .from("credit_card_profiles")
    .update({
      issuer: parsed.data.issuer,
      nickname: parsed.data.nickname,
      card_type_optional: parsed.data.cardType || null,
      last4_optional: parsed.data.last4 || null,
      status: parsed.data.status,
    })
    .eq("id", cardId)
    .eq("user_id", user.id);

  if (error) return { status: "error", message: "Unable to update that card profile." };

  revalidatePath("/offers/cards");
  revalidatePath("/offers");
  revalidatePath("/offers/new");
  return {
    status: "success",
    message: parsed.data.status === "REMOVED" ? "Card profile removed." : "Card profile updated.",
  };
}
