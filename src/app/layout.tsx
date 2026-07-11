import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });
const sans = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "NTG Auction Arena",
  description: "Live tournament player auction.",
  icons: {
    icon: "/ntg-logo.png",
    shortcut: "/ntg-logo.png",
    apple: "/ntg-logo.png",
  },
};

export const viewport = { themeColor: "#070b14" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
