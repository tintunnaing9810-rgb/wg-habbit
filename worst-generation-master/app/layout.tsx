import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import "@/app/globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-body", weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "Worst Generation",
  description: "Track your daily habits and build lasting streaks with your crew.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Worst Generation" },
};

export const viewport: Viewport = { themeColor: "#4F46E5", width: "device-width", initialScale: 1, maximumScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
