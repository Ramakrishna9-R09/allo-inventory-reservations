import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ThemeContext";
import { Plus_Jakarta_Sans, Outfit } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Allo Inventory Reservations",
  description: "Concurrency-safe inventory holds for checkout flows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${plusJakarta.variable} ${outfit.variable} font-sans antialiased text-[#1e293b] bg-slate-50 dark:text-slate-100 dark:bg-slate-950 transition-colors duration-300`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
