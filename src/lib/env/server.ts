import "server-only";

import { z } from "zod";

import { logServerEvent } from "@/lib/server-logger";

const serverEnvironmentSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(20),
  STRIPE_SECRET_KEY: z.string().regex(/^sk_(?:test|live)_/),
  STRIPE_WEBHOOK_SECRET: z.string().regex(/^whsec_/).min(16),
  RATE_LIMIT_SECRET: z.string().min(32),
});

type ServerEnv = z.infer<typeof serverEnvironmentSchema>;

let cached: Readonly<ServerEnv> | undefined;

export function getServerEnv(): Readonly<ServerEnv> {
  if (!cached) {
    const parsed = serverEnvironmentSchema.safeParse({
      SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
      RATE_LIMIT_SECRET: process.env.RATE_LIMIT_SECRET,
    });

    if (!parsed.success) {
      logServerEvent("error", "server_environment_invalid", {
        invalidKeyCount: parsed.error.issues.length,
      });
      throw new Error("Invalid server environment configuration.");
    }

    cached = Object.freeze(parsed.data);
  }

  return cached;
}
