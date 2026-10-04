import { z } from "zod";

export const REWARD_TYPES = [
  "STATEMENT_CREDIT",
  "CASH_BACK",
  "PERCENT_BACK",
  "POINTS",
  "OTHER",
] as const;

const moneyInputSchema = z
  .string()
  .trim()
  .regex(/^\d+(?:\.\d{1,2})?$/, "Enter a non-negative amount with up to two decimals.")
  .transform(Number)
  .refine((value) => Number.isFinite(value) && value <= 9_999_999_999.99, {
    message: "Amount is too large.",
  });

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export const offerFormSchema = z.object({
  cardId: z.uuid("Select a card."),
  merchantId: z.uuid("Select a merchant."),
  title: z.string().trim().min(5, "Title is too short.").max(140, "Title is too long."),
  description: z.string().trim().max(1200, "Description is too long."),
  spendRequirement: moneyInputSchema,
  rewardAmount: moneyInputSchema,
  rewardType: z.enum(REWARD_TYPES, { message: "Select a reward type." }),
  expirationDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid expiration date.")
    .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), {
      message: "Enter a valid expiration date.",
    })
    .refine((value) => value >= todayIso(), {
      message: "Expiration cannot be in the past.",
    }),
});

export const offerIdSchema = z.uuid();

export type OfferFormValues = z.infer<typeof offerFormSchema>;
