import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Shell } from "@/components/shell";
import { PostHogProvider } from "@/components/posthog-provider";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FashionHero — Comfortable, Sustainable Shoes",
  description:
    "Sustainable, supportive, and wildly comfortable shoes made from natural materials.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <PostHogProvider>
          <Shell>{children}</Shell>
        </PostHogProvider>
      </body>
    </html>
  );
}
