import type { Metadata } from "next";
import { Geist_Mono, Cormorant_Garamond, Inter, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/organisms/providers/providers";
import { NuqsAdapter } from "nuqs/adapters/next/app";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const sans = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const serif = Cormorant_Garamond({
  variable: "--font-cormorant-garamond",
  subsets: ["latin"],
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Personal Finance - Dashboard",
  description: "Personal finance and budget management dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        sans.variable,
        serif.variable,
        mono.variable,
        geist.variable,
      )}
    >
      <body className="flex min-h-full flex-col font-sans">
        <NuqsAdapter>
          <Providers>{children}</Providers>
        </NuqsAdapter>
      </body>
    </html>
  );
}
