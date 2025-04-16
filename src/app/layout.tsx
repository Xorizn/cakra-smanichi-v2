// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import Link from "next/link"; // Import Link for Footer

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "YRC Smanichi",
  description:
    "Selalu siap siaga di garis terdepan untuk menjunjung tinggi prinsip kemanusiaan dan menolong sesama. Berkomitmen untuk menyebarkan dan melaksanakan perilaku berperikemanusiaan melalui aksi kepalangmerahan dan menjadi relawan dengan sepenuh hati.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        {" "}
        {/* Ensure body takes full height */}
        <AuthProvider>
          <Navbar />
          {/* Make main content grow */}
          <main className="container mx-auto p-4 flex-grow">{children}</main>
          <Toaster />
          {/* Footer Section */}
          <footer className="w-full border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mt-auto">
            {" "}
            {/* mt-auto pushes footer down */}
            <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center py-4 px-4 text-sm text-muted-foreground">
              <p>
                &copy; {new Date().getFullYear()} YRC Smanichi. Created by Kang.
              </p>
              <nav className="flex gap-4 mt-2 sm:mt-0">
                <Link
                  href="/"
                  className="hover:text-foreground transition-colors"
                >
                  Home
                </Link>
                <Link
                  href="https://yiballl.vercel.app"
                  className="hover:text-foreground transition-colors"
                >
                  About
                </Link>
                {/* Add other footer links if needed */}
              </nav>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
