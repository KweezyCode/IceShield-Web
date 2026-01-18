import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/components/providers/QueryProvider";
import ThemeProvider from "@/components/providers/ThemeProvider";
import { Sidebar } from "@/components/layout/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IceShield Панель",
  description: "Панель администрирования IceShield",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-screen flex overflow-hidden`}
      >
        <QueryProvider>
          <ThemeProvider>
              <Sidebar />
              <main className="flex-1 overflow-auto p-6 bg-background">
                  {children}
              </main>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
