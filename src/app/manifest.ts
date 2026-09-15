import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "HCGF — Horizon Caution",
    short_name: "HCGF",
    description: "AVI, assurance, hébergement et vol — vos dossiers dans une application.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "any",
    lang: "fr",
    dir: "ltr",
    background_color: "#f4f7fc",
    theme_color: "#06203f",
    categories: ["finance", "education", "business"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
