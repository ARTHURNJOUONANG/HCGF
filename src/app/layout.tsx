import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Inter, Newsreader } from "next/font/google";
import { Ambient } from "@/components/Surface";
import { ToastHost } from "@/components/Feedback";
import { InstallerApp } from "@/components/InstallerApp";
import { CookieNotice } from "@/components/CookieNotice";
import { COOKIE_THEME, themeParId, themeValide } from "@/lib/theme";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const display = Newsreader({
  subsets: ["latin"],
  variable: "--font-display",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "HCGF — Horizon Caution & Garantie Financière",
  description:
    "AVI, assurance, hébergement et vol pour les étudiants internationaux. Un espace, tous vos dossiers.",
  applicationName: "HCGF",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HCGF",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

async function themeCourant() {
  return themeValide((await cookies()).get(COOKIE_THEME)?.value);
}

export async function generateViewport(): Promise<Viewport> {
  return {
    themeColor: themeParId(await themeCourant()).couleurNavigateur,
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Thème rendu côté serveur depuis le cookie : aucun flash de couleur au chargement.
  const theme = await themeCourant();
  return (
    <html
      lang="fr"
      data-theme={theme}
      className={`${sans.variable} ${display.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full antialiased" suppressHydrationWarning>
        <Ambient />
        {children}
        <InstallerApp />
        <CookieNotice />
        <ToastHost />
      </body>
    </html>
  );
}
