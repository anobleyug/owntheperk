"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { saveOfferSchema } from "./schema";
import type { SaveOfferState } from "./types";

export async function setSavedOfferAction(
  previousState: SaveOfferState,
  formData: FormData,
): Promise<SaveOfferState> {
  const parsed = saveOfferSchema.safeParse({
    offerId: formData.get("offerId"),
    intent: formData.get("intent"),
  });
  if (!parsed.success) return { ...previousState, status: "error", message: "Invalid offer." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ...previousState, status: "error", message: "Sign in to save offers." };

  const { offerId, intent } = parsed.data;
  const { error } = intent === "save"
    ? await supabase.from("saved_offers").insert({ user_id: user.id, offer_id: offerId })
    : await supabase.from("saved_offers").delete().eq("user_id", user.id).eq("offer_id", offerId);
  if (error && error.code !== "23505") {
    return { ...previousState, status: "error", message: "Your saved offer could not be updated." };
  }

  const saved = intent === "save";
  revalidatePath("/profile/saved");
  revalidatePath(`/offers/${offerId}`);
  return { status: "success", saved, message: saved ? "Offer saved." : "Offer removed." };
}

export async function removeSavedOfferAction(formData: FormData): Promise<void> {
  formData.set("intent", "unsave");
  await setSavedOfferAction({ status: "idle", saved: true }, formData);
}
