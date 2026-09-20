import type { Metadata, Viewport } from "next";
import { Figtree, Noto_Sans } from "next/font/google";
import { FormularEnterSchutz } from "@/components/formular/formular-enter-schutz";
import { UngespeicherteAenderungenSchutz } from "@/components/formular/ungespeicherte-aenderungen-schutz";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const notoSans = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-noto-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "WundDoku",
    template: "%s · WundDoku",
  },
  description: "Digitale Wunddokumentation für Praxis und Pflege",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // maximumScale bewusst nicht gesetzt: Zoom darf nie unterbunden werden.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className={`${figtree.variable} ${notoSans.variable} antialiased`}>
        <ThemeProvider>
          <FormularEnterSchutz />
          <UngespeicherteAenderungenSchutz />
          <a
            href="#hauptinhalt"
            className="nur-screenreader focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-3 focus:text-on-primary"
          >
            Zum Hauptinhalt springen
          </a>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
