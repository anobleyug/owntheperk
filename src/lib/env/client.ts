import { z } from "zod";

const publicEnvironmentSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url().refine((value) => {
    const url = new URL(value);
    return url.protocol === "https:" || ["localhost", "127.0.0.1"].includes(url.hostname);
  }, "Supabase URL must use HTTPS outside local development."),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().regex(/^pk_(?:test|live)_/),
  NEXT_PUBLIC_APP_URL: z.url().refine((value) => {
    const url = new URL(value);
    const secure = url.protocol === "https:" || ["localhost", "127.0.0.1"].includes(url.hostname);
    return secure && url.username === "" && url.password === "" && url.pathname === "/" && !url.search && !url.hash;
  }, "App URL must be an HTTPS origin without credentials, path, query, or fragment."),
});

const parsedPublicEnvironment = publicEnvironmentSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});

if (!parsedPublicEnvironment.success) {
  throw new Error("Invalid public environment configuration.");
}

export const publicEnv = Object.freeze(parsedPublicEnvironment.data);
