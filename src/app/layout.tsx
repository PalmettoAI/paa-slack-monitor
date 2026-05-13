import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PAA Slack Monitor",
  description: "Palmetto AI Automation — Slack community monitoring + draft replies",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased text-ink">{children}</body>
    </html>
  );
}
