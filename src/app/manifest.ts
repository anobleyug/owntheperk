import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Own the Perk",
    short_name: "Own the Perk",
    description:
      "Find people with unused credit card offers for brands you already plan to shop with.",
    start_url: "/search",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#fafaf5",
    theme_color: "#174f53",
    categories: ["shopping", "finance", "lifestyle"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Find an offer", short_name: "Search", url: "/search" },
      { name: "List my offer", short_name: "Add offer", url: "/offers/new" },
      { name: "Messages", short_name: "Messages", url: "/messages" },
    ],
  };
}
