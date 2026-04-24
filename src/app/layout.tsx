import type { Metadata } from "next";
import AuthGate from "@/components/AuthGate";
import "./globals.css";

export const metadata: Metadata = { title: "DSA", description: "DSA Tracker" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark-minimal">
      <body>
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
