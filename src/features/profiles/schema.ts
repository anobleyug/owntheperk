import { z } from "zod";

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 24;

const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "help",
  "moderator",
  "null",
  "official",
  "own-the-perk",
  "own_the_perk",
  "owntheperk",
  "root",
  "security",
  "staff",
  "support",
  "system",
  "undefined",
]);

export const usernameSchema = z
  .string()
  .trim()
  .min(USERNAME_MIN_LENGTH, "Use at least 3 characters.")
  .max(USERNAME_MAX_LENGTH, "Use no more than 24 characters.")
  .regex(/^[A-Za-z][A-Za-z0-9_-]*$/, {
    message: "Start with a letter and use only letters, numbers, _ or -.",
  })
  .refine((value) => !RESERVED_USERNAMES.has(value.toLowerCase()), {
    message: "That username is reserved.",
  })
  .refine((value) => (value.match(/\d/g) ?? []).length < 7, {
    message: "Do not include a phone number in your username.",
  });

const optionalAvatarUrlSchema = z
  .string()
  .trim()
  .max(2048, "Avatar URL is too long.")
  .refine(
    (value) => value === "" || z.url().safeParse(value).success,
    "Enter a valid URL.",
  )
  .refine(
    (value) => value === "" || value.startsWith("https://"),
    "Avatar URLs must use HTTPS.",
  );

export const profileFormSchema = z.object({
  username: usernameSchema,
  avatarUrl: optionalAvatarUrlSchema,
  bio: z.string().trim().max(240, "Bio must be 240 characters or fewer."),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
