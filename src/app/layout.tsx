import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/context/WalletContext";
import { PaymentConfigProvider } from "@/context/PaymentConfigContext";
import { Header } from "@/components/Header";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "GOALIQ — World Cup Intelligence",
  description:
    "Live World Cup 2026 scores, AI match insights, and Injective micropayments. Built for the Injective Global Cup hackathon.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} font-sans antialiased`}>
        <WalletProvider>
          <PaymentConfigProvider>
            <Header />
            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
          </PaymentConfigProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
