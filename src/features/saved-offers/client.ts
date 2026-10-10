export async function fetchSavedOfferIds() {
  const response = await fetch("/api/saved-offers", { credentials: "same-origin" });
  if (!response.ok) throw new Error("Unable to load saved offers.");
  return response.json() as Promise<string[]>;
}
