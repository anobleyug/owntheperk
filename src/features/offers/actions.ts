"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { FormState } from "@/features/auth/types";
import { createClient } from "@/lib/supabase/server";

import { EVIDENCE_BUCKET, validateEvidenceFile } from "./evidence";
import { offerListingFormSchema, offerListingIdSchema } from "./schema";

type EvidenceRecord = { id: string; evidence_path: string };

function listingValues(formData: FormData) {
  return {
    cardId: formData.get("cardId"),
    offerId: formData.get("offerId"),
    minSpend: formData.get("minSpend"),
    askAmount: formData.get("askAmount"),
    isObo: formData.get("isObo"),
  };
}

function evidenceFrom(formData: FormData) {
  const value = formData.get("evidence");
  return value instanceof File && value.size > 0 ? value : null;
}

async function authenticatedClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

async function validateAssociations(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  cardId: string,
  offerId: string,
) {
  const today = new Date().toISOString().slice(0, 10);
  const [cardResult, offerResult] = await Promise.all([
    supabase.from("credit_card_profiles").select("id").eq("id", cardId).eq("user_id", userId).eq("status", "ACTIVE").maybeSingle(),
    supabase.from("offers").select("id").eq("id", offerId).eq("status", "ACTIVE").gte("expiration_date", today).maybeSingle(),
  ]);
  return Boolean(cardResult.data && offerResult.data && !cardResult.error && !offerResult.error);
}

async function storeEvidence({
  supabase, userId, listingId, cardId, file,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  listingId: string;
  cardId: string;
  file: File;
}) {
  const validated = await validateEvidenceFile(file);
  if ("error" in validated) return { error: validated.error } as const;

  const objectPath = `${userId}/${listingId}/${randomUUID()}.${validated.extension}`;
  const { error: uploadError } = await supabase.storage.from(EVIDENCE_BUCKET).upload(objectPath, file, {
    contentType: validated.mime,
    cacheControl: "private, max-age=0, no-store",
    upsert: false,
  });
  if (uploadError) return { error: "Evidence upload failed. The listing remains a draft." } as const;

  const { data: existing } = await supabase.from("offer_listing_verifications")
    .select("id, evidence_path").eq("offer_listing_id", listingId).eq("user_id", userId)
    .maybeSingle<EvidenceRecord>();
  const mutation = existing
    ? supabase.from("offer_listing_verifications").update({ evidence_path: objectPath }).eq("id", existing.id).eq("user_id", userId)
    : supabase.from("offer_listing_verifications").insert({
      user_id: userId, offer_listing_id: listingId, card_id: cardId, evidence_path: objectPath,
    });
  const { error: recordError } = await mutation;
  if (recordError) {
    await supabase.storage.from(EVIDENCE_BUCKET).remove([objectPath]);
    return { error: "Evidence metadata could not be saved. The listing remains a draft." } as const;
  }
  if (existing?.evidence_path) await supabase.storage.from(EVIDENCE_BUCKET).remove([existing.evidence_path]);
  return { stored: true } as const;
}

async function submitListing(supabase: Awaited<ReturnType<typeof createClient>>, listingId: string) {
  const { error } = await supabase.rpc("submit_offer_listing_for_verification", { target_listing_id: listingId });
  if (!error) return null;
  if (error.message.includes("Expired")) return "Expired offers cannot be submitted.";
  if (error.message.includes("asking amount")) return "Add an asking amount before submitting.";
  if (error.message.includes("evidence")) return "Upload verification evidence before submitting.";
  return "This listing could not be submitted for verification.";
}

function validationState(error: ReturnType<typeof offerListingFormSchema.safeParse>) {
  if (error.success) return null;
  return {
    status: "error" as const,
    message: "Check the listing details and try again.",
    fieldErrors: error.error.flatten().fieldErrors,
  };
}

export async function createOfferListingAction(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = offerListingFormSchema.safeParse(listingValues(formData));
  const invalid = validationState(parsed);
  if (invalid || !parsed.success) return invalid!;

  const intent = formData.get("intent") === "submit" ? "submit" : "draft";
  const evidence = evidenceFrom(formData);
  if (intent === "submit" && !evidence) {
    return { status: "error", message: "Upload verification evidence before submitting.", fieldErrors: { evidence: ["Evidence is required for submission."] } };
  }
  if (evidence) {
    const validation = await validateEvidenceFile(evidence);
    if ("error" in validation && validation.error) {
      return { status: "error", message: validation.error, fieldErrors: { evidence: [validation.error] } };
    }
  }

  const { supabase, user } = await authenticatedClient();
  if (!(await validateAssociations(supabase, user.id, parsed.data.cardId, parsed.data.offerId))) {
    return { status: "error", message: "Select an active card and current credit card offer." };
  }

  const listingId = randomUUID();
  const { error: insertError } = await supabase.from("offer_listings").insert({
    id: listingId,
    user_id: user.id,
    card_id: parsed.data.cardId,
    offer_id: parsed.data.offerId,
    min_spend: parsed.data.minSpend,
    ask_amount: parsed.data.askAmount,
    is_obo: parsed.data.isObo,
  });
  if (insertError) return { status: "error", message: "Unable to create that listing." };

  if (evidence) {
    const stored = await storeEvidence({ supabase, userId: user.id, listingId, cardId: parsed.data.cardId, file: evidence });
    if ("error" in stored) return { status: "error", message: stored.error };
  }
  if (intent === "submit") {
    revalidatePath("/offers");
    redirect(`/offers/${listingId}?listingFee=required`);
  }
  revalidatePath("/offers");
  redirect(`/offers/${listingId}`);
}

export async function updateOfferListingAction(listingId: string, _state: FormState, formData: FormData): Promise<FormState> {
  if (!offerListingIdSchema.safeParse(listingId).success) return { status: "error", message: "Invalid listing." };
  const parsed = offerListingFormSchema.safeParse(listingValues(formData));
  const invalid = validationState(parsed);
  if (invalid || !parsed.success) return invalid!;

  const evidence = evidenceFrom(formData);
  if (evidence) {
    const validation = await validateEvidenceFile(evidence);
    if ("error" in validation && validation.error) {
      return { status: "error", message: validation.error, fieldErrors: { evidence: [validation.error] } };
    }
  }

  const { supabase, user } = await authenticatedClient();
  if (!(await validateAssociations(supabase, user.id, parsed.data.cardId, parsed.data.offerId))) {
    return { status: "error", message: "Select an active card and current credit card offer." };
  }
  const [{ data: currentListing }, { data: currentEvidence }] = await Promise.all([
    supabase.from("offer_listings").select("card_id, offer_id").eq("id", listingId).eq("user_id", user.id).maybeSingle<{ card_id: string; offer_id: string }>(),
    supabase.from("offer_listing_verifications").select("id").eq("offer_listing_id", listingId).eq("user_id", user.id).maybeSingle(),
  ]);
  if (!currentListing) return { status: "error", message: "Listing not found." };
  if (currentEvidence && currentListing.card_id !== parsed.data.cardId) {
    return { status: "error", message: "A card cannot be changed after evidence is attached. Create a new listing instead.", fieldErrors: { cardId: ["Keep the original card for this evidence record."] } };
  }
  if (currentEvidence && currentListing.offer_id !== parsed.data.offerId) {
    return { status: "error", message: "The credit card offer cannot change after evidence is attached. Create a new listing instead.", fieldErrors: { offerId: ["Keep the original offer for this evidence record."] } };
  }

  const { data: updated, error: updateError } = await supabase.from("offer_listings").update({
    card_id: parsed.data.cardId,
    offer_id: parsed.data.offerId,
    min_spend: parsed.data.minSpend,
    ask_amount: parsed.data.askAmount,
    is_obo: parsed.data.isObo,
  }).eq("id", listingId).eq("user_id", user.id).select("id").maybeSingle();
  if (updateError || !updated) return { status: "error", message: "This listing is not editable or could not be updated." };

  if (evidence) {
    const stored = await storeEvidence({ supabase, userId: user.id, listingId, cardId: parsed.data.cardId, file: evidence });
    if ("error" in stored) return { status: "error", message: stored.error };
  }
  if (formData.get("intent") === "submit") {
    const { data: paidFee } = await supabase.from("platform_payments")
      .select("id")
      .eq("offer_listing_id", listingId)
      .eq("payment_type", "LISTING_FEE")
      .eq("status", "SUCCEEDED")
      .maybeSingle();
    if (paidFee) {
      const submissionError = await submitListing(supabase, listingId);
      if (submissionError) return { status: "error", message: submissionError };
    } else {
      revalidatePath("/offers");
      revalidatePath(`/offers/${listingId}`);
      redirect(`/offers/${listingId}?listingFee=required`);
    }
  }
  revalidatePath("/offers");
  revalidatePath(`/offers/${listingId}`);
  redirect(`/offers/${listingId}`);
}

export async function submitOfferListingAction(listingId: string) {
  if (!offerListingIdSchema.safeParse(listingId).success) redirect("/offers");
  const { supabase } = await authenticatedClient();
  const error = await submitListing(supabase, listingId);
  if (error) redirect(`/offers/${listingId}?submission=error`);
  revalidatePath("/offers");
  revalidatePath(`/offers/${listingId}`);
  redirect(`/offers/${listingId}?submission=success`);
}
