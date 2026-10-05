import "server-only";

import { z } from "zod";

const serverEnvironmentSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
});

type ServerEnv = z.infer<typeof serverEnvironmentSchema>;

let cached: Readonly<ServerEnv> | undefined;

export function getServerEnv(): Readonly<ServerEnv> {
  if (!cached) {
    const parsed = serverEnvironmentSchema.safeParse({
      SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    });

    if (!parsed.success) {
      console.error(
        "Missing/invalid server env keys:",
        parsed.error.issues.map((i) => i.path.join(".")),
      );
      throw new Error("Invalid server environment configuration.");
    }

    cached = Object.freeze(parsed.data);
  }

  return cached;
}