import type { NextConfig } from "next";

/**
 * Patientendaten: Die App laeuft on-premise und soll nichts nach aussen geben.
 * Die CSP erlaubt deshalb keine fremden Quellen ausser den Google-Fonts-Hosts.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=(self)" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js braucht inline-Styles und im Dev-Modus eval.
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' blob: data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp", "heic-convert", "@prisma/client", "bcryptjs"],
  experimental: {
    serverActions: {
      // Wundfotos koennen gross sein.
      bodySizeLimit: "20mb",
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
