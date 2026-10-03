import type { MetadataRoute } from "next";

/**
 * Web-App-Manifest fuer die Installation auf dem Home-Bildschirm.
 *
 * Bewusst ohne Service Worker: Die App verarbeitet Gesundheitsdaten und soll
 * nichts offline zwischenspeichern. Das Manifest liefert nur Name und Symbole.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WundDoku",
    short_name: "WundDoku",
    description: "Digitale Wunddokumentation für Praxis und Pflege",
    lang: "de",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#f8fafc",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
