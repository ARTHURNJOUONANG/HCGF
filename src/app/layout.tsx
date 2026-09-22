import type { Metadata, Viewport } from "next";
import { Inter, Newsreader } from "next/font/google";
import { Ambient } from "@/components/Surface";
import { ToastHost } from "@/components/Feedback";
import { InstallerApp } from "@/components/InstallerApp";
import { CookieNotice } from "@/components/CookieNotice";
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

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  themeColor: "#06203f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${sans.variable} ${display.variable} h-full`} suppressHydrationWarning>
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
