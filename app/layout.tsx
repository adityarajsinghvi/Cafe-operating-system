import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono, Calistoga } from "next/font/google";

import { QueryProvider } from "@/components/shared/query-provider";
import { ThemeProvider } from "@/components/shared/theme-provider";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const calistoga = Calistoga({
  variable: "--font-calistoga",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: {
    default: "Parcha — AI OS for cafes",
    template: "%s · Parcha",
  },
  description:
    "The AI-powered operating system for modern cafes. Smart menus, customer memory, loyalty, and campaigns — all in one place.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,        // prevent Safari auto-zoom on input focus
  userScalable: false,    // prevent pinch-zoom causing "zoomed in" feeling
  viewportFit: "cover",  // respect notch / home indicator safe areas
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#3d3929" },
    { media: "(prefers-color-scheme: dark)", color: "#3d3929" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${geistMono.variable} ${calistoga.variable} min-h-screen antialiased`}
      >
        <ThemeProvider>
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
