import { z } from "zod";

import { FEEDBACK_CATEGORIES, FEEDBACK_TYPES } from "./types";

const optionalCategorySchema = z.preprocess(
  (value) => value === "" ? undefined : value,
  z.enum(FEEDBACK_CATEGORIES).optional(),
);

const optionalAppPathSchema = z.preprocess(
  (value) => value === "" ? undefined : value,
  z.string()
    .trim()
    .max(500, "Page URL is too long.")
    .regex(/^\/(?!\/)/, "Page URL must be an app path.")
    .optional(),
);

export const feedbackSubmissionSchema = z.strictObject({
  type: z.enum(FEEDBACK_TYPES),
  category: optionalCategorySchema,
  subject: z.string().trim().min(1, "Enter a subject.").max(120, "Subject must be 120 characters or fewer."),
  message: z.string().trim().min(1, "Enter a message.").max(4000, "Message must be 4,000 characters or fewer."),
  pageUrl: optionalAppPathSchema,
});

export type FeedbackSubmissionValues = z.infer<typeof feedbackSubmissionSchema>;

