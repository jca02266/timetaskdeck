import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TimeTaskDeck",
  description: "Focus-first task management with a deck-style interface",
  openGraph: {
    title: "TimeTaskDeck",
    description: "Focus-first task management with a deck-style interface",
    url: "https://timetaskdeck.netlify.app/",
    siteName: "TimeTaskDeck",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TimeTaskDeck",
    description: "Focus-first task management with a deck-style interface",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
