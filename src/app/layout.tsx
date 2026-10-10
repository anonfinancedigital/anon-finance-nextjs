import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist_Mono, Manrope, Sora } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BRAND_DESCRIPTION, BRAND_NAME, BRAND_TITLE_TEMPLATE } from "@/lib/brand";

/** Applies the saved theme before first paint (dark when none is saved) to avoid a flash of the wrong one. */
const themeScript = `try{if(localStorage.getItem("theme")!=="light")document.documentElement.classList.add("dark")}catch(e){document.documentElement.classList.add("dark")}`;

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: BRAND_NAME, template: BRAND_TITLE_TEMPLATE },
  description: BRAND_DESCRIPTION,
  // Dark favicon is the default (and the fallback when `media` is unsupported); the light one wins on a light system theme.
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-light.svg", type: "image/svg+xml", media: "(prefers-color-scheme: light)" },
    ],
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Reading the request headers opts every page into dynamic rendering, which the CSP nonce requires.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html
      lang="pt-BR"
      className={`${manrope.variable} ${sora.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
