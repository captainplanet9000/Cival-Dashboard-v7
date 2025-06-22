import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ErrorBoundary from "@/lib/error-handling/error-boundary";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cival Dashboard - Algorithmic Trading Platform",
  description: "Advanced algorithmic trading dashboard with AI-powered strategies, real-time analytics, and comprehensive risk management",
  keywords: ["algorithmic trading", "trading dashboard", "AI trading", "financial analytics", "risk management"],
  authors: [{ name: "Cival Trading Team" }],
  viewport: "width=device-width, initial-scale=1",
  robots: "noindex, nofollow", // Private trading platform
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geist.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ErrorBoundary>
          <div id="root" className="min-h-screen">
            {children}
          </div>
        </ErrorBoundary>
      </body>
    </html>
  );
}
