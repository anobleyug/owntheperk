import { z } from "zod";

export const saveOfferSchema = z.object({
  offerId: z.uuid(),
  intent: z.enum(["save", "unsave"]),
});
