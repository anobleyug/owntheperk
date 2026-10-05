import "server-only";

type LogLevel = "info" | "warn" | "error";
type SafeValue = string | number | boolean | null;

const FORBIDDEN_KEY = /(secret|token|password|authorization|cookie|email|phone|message|content|evidence|card|payment_intent)/i;

export function logServerEvent(
  level: LogLevel,
  event: string,
  context: Record<string, SafeValue> = {},
) {
  const safeContext = Object.fromEntries(
    Object.entries(context)
      .filter(([key]) => !FORBIDDEN_KEY.test(key))
      .map(([key, value]) => [key, typeof value === "string" ? value.slice(0, 160) : value]),
  );
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event: event.slice(0, 80),
    ...safeContext,
  });

  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.info(entry);
}
