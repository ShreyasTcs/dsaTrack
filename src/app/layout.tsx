import type { Metadata } from "next";
import { ThemeProvider } from "@/context/ThemeContext";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = { title: "dsa", description: "DSA Tracker" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark-minimal">
      <body>
        <ThemeProvider>
          <Navbar />
          <main className="container">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
