import { z } from "zod";

export const CARD_STATUSES = ["ACTIVE", "INACTIVE", "REMOVED"] as const;

export const cardFormSchema = z.object({
  issuer: z.string().trim().min(2, "Enter an issuer.").max(64, "Issuer is too long."),
  nickname: z
    .string()
    .trim()
    .min(2, "Enter a private nickname.")
    .max(64, "Nickname is too long."),
  cardType: z
    .string()
    .trim()
    .refine((value) => value === "" || value.length >= 2, "Card type is too short.")
    .refine((value) => value.length <= 64, "Card type is too long."),
  last4: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{4}$/.test(value), {
      message: "Enter exactly four digits or leave this blank.",
    }),
});

export const cardUpdateSchema = cardFormSchema.extend({
  cardId: z.uuid(),
  status: z.enum(CARD_STATUSES),
});

export type CardFormValues = z.infer<typeof cardFormSchema>;
