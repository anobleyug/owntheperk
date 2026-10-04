import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Own the Perk",
    short_name: "Own the Perk",
    description:
      "A pseudonymous discovery marketplace for verified merchant-specific card offers.",
    start_url: "/search",
    display: "standalone",
    background_color: "#fafaf5",
    theme_color: "#174f53",
  };
}
