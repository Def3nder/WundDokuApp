import type { MetadataRoute } from "next";

/**
 * Web-App-Manifest fuer die Installation auf dem Home-Bildschirm (iOS und Android).
 *
 * Offline laeuft ausschliesslich die persoenliche Zeiterfassung, siehe
 * public/sw.js. Alles andere bleibt bewusst online, weil dort Gesundheitsdaten
 * liegen, die nicht auf dem Geraet zwischengespeichert werden sollen.
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
    shortcuts: [{ name: "Zeiterfassung", url: "/zeiterfassung", icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }] }],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
