"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { FormState } from "@/features/auth/types";
import { createClient } from "@/lib/supabase/server";

import { EVIDENCE_BUCKET, validateEvidenceFile } from "./evidence";
import { offerFormSchema, offerIdSchema } from "./schema";

type EvidenceRecord = { id: string; evidence_path: string };

function offerValues(formData: FormData) {
  return {
    cardId: formData.get("cardId"),
    merchantId: formData.get("merchantId"),
    title: formData.get("title"),
    description: formData.get("description"),
    spendRequirement: formData.get("spendRequirement"),
    rewardAmount: formData.get("rewardAmount"),
    rewardType: formData.get("rewardType"),
    expirationDate: formData.get("expirationDate"),
  };
}

function evidenceFrom(formData: FormData) {
  const value = formData.get("evidence");
  return value instanceof File && value.size > 0 ? value : null;
}

async function authenticatedClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

async function validateAssociations(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  cardId: string,
  merchantId: string,
) {
  const [cardResult, merchantResult] = await Promise.all([
    supabase
      .from("credit_card_profiles")
      .select("id")
      .eq("id", cardId)
      .eq("user_id", userId)
      .eq("status", "ACTIVE")
      .maybeSingle(),
    supabase
      .from("merchants")
      .select("id")
      .eq("id", merchantId)
      .eq("status", "ACTIVE")
      .maybeSingle(),
  ]);

  return Boolean(cardResult.data && merchantResult.data && !cardResult.error && !merchantResult.error);
}

async function storeEvidence({
  supabase,
  userId,
  offerId,
  cardId,
  file,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  offerId: string;
  cardId: string;
  file: File;
}) {
  const validated = await validateEvidenceFile(file);
  if ("error" in validated) return { error: validated.error } as const;

  const objectPath = `${userId}/${offerId}/${randomUUID()}.${validated.extension}`;
  const { error: uploadError } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .upload(objectPath, file, {
      contentType: validated.mime,
      cacheControl: "private, max-age=0, no-store",
      upsert: false,
    });

  if (uploadError) return { error: "Evidence upload failed. The offer remains a draft." } as const;

  const { data: existing } = await supabase
    .from("offer_verifications")
    .select("id, evidence_path")
    .eq("offer_id", offerId)
    .eq("user_id", userId)
    .maybeSingle<EvidenceRecord>();

  const mutation = existing
    ? supabase
        .from("offer_verifications")
        .update({ evidence_path: objectPath })
        .eq("id", existing.id)
        .eq("user_id", userId)
    : supabase.from("offer_verifications").insert({
        user_id: userId,
        offer_id: offerId,
        card_id: cardId,
        evidence_path: objectPath,
      });
  const { error: recordError } = await mutation;

  if (recordError) {
    await supabase.storage.from(EVIDENCE_BUCKET).remove([objectPath]);
    return { error: "Evidence metadata could not be saved. The offer remains a draft." } as const;
  }

  if (existing?.evidence_path) {
    await supabase.storage.from(EVIDENCE_BUCKET).remove([existing.evidence_path]);
  }

  return { stored: true } as const;
}

async function submitOffer(
  supabase: Awaited<ReturnType<typeof createClient>>,
  offerId: string,
) {
  const { error } = await supabase.rpc("submit_offer_for_verification", {
    target_offer_id: offerId,
  });

  if (!error) return null;
  if (error.message.includes("Expired")) return "Expired offers cannot be submitted.";
  if (error.message.includes("evidence")) return "Upload verification evidence before submitting.";
  return "This offer could not be submitted for verification.";
}

function validationState(error: ReturnType<typeof offerFormSchema.safeParse>) {
  if (error.success) return null;
  return {
    status: "error" as const,
    message: "Check the offer details and try again.",
    fieldErrors: error.error.flatten().fieldErrors,
  };
}

export async function createOfferAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = offerFormSchema.safeParse(offerValues(formData));
  const invalid = validationState(parsed);
  if (invalid || !parsed.success) return invalid!;

  const intent = formData.get("intent") === "submit" ? "submit" : "draft";
  const evidence = evidenceFrom(formData);
  if (intent === "submit" && !evidence) {
    return {
      status: "error",
      message: "Upload verification evidence before submitting.",
      fieldErrors: { evidence: ["Evidence is required for submission."] },
    };
  }

  if (evidence) {
    const validation = await validateEvidenceFile(evidence);
    if ("error" in validation && validation.error) {
      return {
        status: "error",
        message: validation.error,
        fieldErrors: { evidence: [validation.error] },
      };
    }
  }

  const { supabase, user } = await authenticatedClient();
  if (!(await validateAssociations(supabase, user.id, parsed.data.cardId, parsed.data.merchantId))) {
    return { status: "error", message: "Select an active card and merchant you can access." };
  }

  const offerId = randomUUID();
  const { error: insertError } = await supabase.from("offers").insert({
    id: offerId,
    user_id: user.id,
    card_id: parsed.data.cardId,
    merchant_id: parsed.data.merchantId,
    title: parsed.data.title,
    description: parsed.data.description,
    spend_requirement: parsed.data.spendRequirement,
    reward_amount: parsed.data.rewardAmount,
    reward_type: parsed.data.rewardType,
    expiration_date: parsed.data.expirationDate,
  });

  if (insertError) return { status: "error", message: "Unable to create that offer." };

  if (evidence) {
    const stored = await storeEvidence({
      supabase,
      userId: user.id,
      offerId,
      cardId: parsed.data.cardId,
      file: evidence,
    });
    if ("error" in stored) return { status: "error", message: stored.error };
  }

  if (intent === "submit") {
    const submissionError = await submitOffer(supabase, offerId);
    if (submissionError) return { status: "error", message: submissionError };
  }

  revalidatePath("/offers");
  redirect(`/offers/${offerId}`);
}

export async function updateOfferAction(
  offerId: string,
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const validId = offerIdSchema.safeParse(offerId);
  if (!validId.success) return { status: "error", message: "Invalid offer." };

  const parsed = offerFormSchema.safeParse(offerValues(formData));
  const invalid = validationState(parsed);
  if (invalid || !parsed.success) return invalid!;

  const evidence = evidenceFrom(formData);
  if (evidence) {
    const validation = await validateEvidenceFile(evidence);
    if ("error" in validation && validation.error) {
      return {
        status: "error",
        message: validation.error,
        fieldErrors: { evidence: [validation.error] },
      };
    }
  }

  const { supabase, user } = await authenticatedClient();
  if (!(await validateAssociations(supabase, user.id, parsed.data.cardId, parsed.data.merchantId))) {
    return { status: "error", message: "Select an active card and merchant you can access." };
  }

  const [{ data: currentOffer }, { data: currentEvidence }] = await Promise.all([
    supabase
      .from("offers")
      .select("card_id")
      .eq("id", offerId)
      .eq("user_id", user.id)
      .maybeSingle<{ card_id: string }>(),
    supabase
      .from("offer_verifications")
      .select("id")
      .eq("offer_id", offerId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  if (!currentOffer) return { status: "error", message: "Offer not found." };
  if (currentEvidence && currentOffer.card_id !== parsed.data.cardId) {
    return {
      status: "error",
      message: "A card cannot be changed after evidence is attached. Create a new offer instead.",
      fieldErrors: { cardId: ["Keep the original card for this evidence record."] },
    };
  }

  const { data: updated, error: updateError } = await supabase
    .from("offers")
    .update({
      card_id: parsed.data.cardId,
      merchant_id: parsed.data.merchantId,
      title: parsed.data.title,
      description: parsed.data.description,
      spend_requirement: parsed.data.spendRequirement,
      reward_amount: parsed.data.rewardAmount,
      reward_type: parsed.data.rewardType,
      expiration_date: parsed.data.expirationDate,
    })
    .eq("id", offerId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (updateError || !updated) {
    return { status: "error", message: "This offer is not editable or could not be updated." };
  }

  if (evidence) {
    const stored = await storeEvidence({
      supabase,
      userId: user.id,
      offerId,
      cardId: parsed.data.cardId,
      file: evidence,
    });
    if ("error" in stored) return { status: "error", message: stored.error };
  }

  if (formData.get("intent") === "submit") {
    const submissionError = await submitOffer(supabase, offerId);
    if (submissionError) return { status: "error", message: submissionError };
  }

  revalidatePath("/offers");
  revalidatePath(`/offers/${offerId}`);
  redirect(`/offers/${offerId}`);
}

export async function submitOfferAction(offerId: string) {
  const validId = offerIdSchema.safeParse(offerId);
  if (!validId.success) redirect("/offers");

  const { supabase } = await authenticatedClient();
  const error = await submitOffer(supabase, offerId);
  if (error) redirect(`/offers/${offerId}?submission=error`);

  revalidatePath("/offers");
  revalidatePath(`/offers/${offerId}`);
  redirect(`/offers/${offerId}?submission=success`);
}
