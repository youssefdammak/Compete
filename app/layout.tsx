import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Competitor Tracking",
  description: "Track competitor products and pricing",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
