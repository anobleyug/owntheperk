import { z } from "zod";

export const merchantFollowSchema = z.object({
  merchantId: z.uuid(),
  intent: z.enum(["follow", "unfollow"]),
});

export const notificationIdSchema = z.uuid();
