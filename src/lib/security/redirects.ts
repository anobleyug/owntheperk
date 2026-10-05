const ALLOWED_AUTH_DESTINATIONS = new Set(["/onboarding", "/reset-password", "/search"]);

export function safeAuthDestination(value: string | null | undefined) {
  if (!value || /[\\\u0000-\u001f\u007f]/.test(value)) return "/onboarding";

  try {
    const base = new URL("https://redirect.invalid");
    const candidate = new URL(value, base);
    if (candidate.origin !== base.origin || !ALLOWED_AUTH_DESTINATIONS.has(candidate.pathname)) {
      return "/onboarding";
    }
    return candidate.pathname;
  } catch {
    return "/onboarding";
  }
}

export function safeStripeCheckoutUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const stripeHost = url.hostname === "checkout.stripe.com" || url.hostname.endsWith(".checkout.stripe.com");
    return url.protocol === "https:" && stripeHost && !url.username && !url.password ? url.toString() : null;
  } catch {
    return null;
  }
}
