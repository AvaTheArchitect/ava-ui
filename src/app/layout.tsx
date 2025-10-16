import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import '@/styles/alphaTab.css';
import "./globals.css";
import '@/styles/maestroCursor.css';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Maestro AI",
  description: "AI-Powered Music Learning Platform",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Maestro AI",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "Maestro AI",
    description: "AI-Powered Music Learning Platform",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Maestro AI",
    description: "AI-Powered Music Learning Platform",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#1a1a2e",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* PWA Meta Tags for iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Maestro AI" />

        {/* PWA Meta Tags for Android */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#1a1a2e" />

        {/* iOS Icons */}
        <link rel="apple-touch-icon" href="/icon-192x192.png" />

        {/* PWA Optimizations */}
        <style>{`
          /* Base PWA adjustments */
          html, body {
            overflow-x: hidden;
            -webkit-text-size-adjust: 100%;
            -webkit-tap-highlight-color: transparent;
          }
          
          /* Safe area adjustments for iPhone notch - ONLY for fixed elements */
          .safe-area-top {
            padding-top: env(safe-area-inset-top);
          }
          
          .safe-area-bottom {
            padding-bottom: env(safe-area-inset-bottom);
          }
          
          /* Prevent text selection ONLY in music notation areas */
          .at-surface,
          .at-viewport {
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
            -webkit-touch-callout: none;
            /* Allow AlphaTab to handle its own touch events */
            touch-action: manipulation;
          }
          
          /* Ensure containers respect viewport boundaries */
          * {
            box-sizing: border-box;
          }
        `}</style>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}