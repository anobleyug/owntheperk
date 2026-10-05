import { z } from "zod";

const moneyInputSchema = z.string().trim()
  .regex(/^\d+(?:\.\d{1,2})?$/, "Enter a non-negative amount with up to two decimals.")
  .transform(Number)
  .refine((value) => Number.isFinite(value) && value <= 9_999_999_999.99, { message: "Amount is too large." });

export const offerListingFormSchema = z.object({
  cardId: z.uuid("Select a card."),
  offerId: z.uuid("Select an offer."),
  minSpend: moneyInputSchema,
  askAmount: moneyInputSchema,
  isObo: z.preprocess((value) => value === "on" || value === "true", z.boolean()),
});

export const offerListingIdSchema = z.uuid();
export type OfferListingFormValues = z.infer<typeof offerListingFormSchema>;
