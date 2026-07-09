import type { Metadata } from "next";
import { Plus_Jakarta_Sans, DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/context/WalletContext";
import { PaymentConfigProvider } from "@/context/PaymentConfigContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { Header } from "@/components/Header";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-hero",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "GOALIQ — World Cup Intelligence",
  description:
    "Live World Cup 2026 scores, AI match insights, and Injective micropayments. Built for the Injective Global Cup hackathon.",
};

const themeScript = `(function(){try{var t=localStorage.getItem('goaliq-theme');document.documentElement.classList.remove('light','dark');document.documentElement.classList.add(t==='light'?'light':'dark');}catch(e){document.documentElement.classList.add('dark');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${jakarta.variable} ${dmSans.variable} ${fraunces.variable} font-sans antialiased`}>
        <ThemeProvider>
          <WalletProvider>
            <PaymentConfigProvider>
              <Header />
              <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
            </PaymentConfigProvider>
          </WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
