import type { Metadata } from "next";
import { JetBrains_Mono, Manrope } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { Providers } from "@/app/providers";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BugFlow",
  description: "Production-ready issue tracking with JWT auth, kanban workflow, comments, and audit logs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans text-foreground">
        <Providers>{children}</Providers>
        <SpeedInsights />
      </body>
    </html>
  );
}
