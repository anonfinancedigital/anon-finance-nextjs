import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Geist_Mono, Manrope, Sora } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { THEME_COLOR } from "@/lib/theme-color";
import { BRAND_DESCRIPTION, BRAND_NAME, BRAND_TITLE_TEMPLATE } from "@/lib/brand";

/** Applies the saved theme before first paint (dark when none is saved) to avoid a flash of the wrong one. */
const themeScript = `var d=true;try{d=localStorage.getItem("theme")!=="light"}catch(e){}if(d)document.documentElement.classList.add("dark");var m=document.querySelector('meta[name="theme-color"]');if(!m){m=document.createElement("meta");m.name="theme-color";document.head.appendChild(m)}m.content=d?"${THEME_COLOR.dark}":"${THEME_COLOR.light}"`;

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

// `viewport-fit=cover` lets the page paint under the notch (the `env(safe-area-inset-*)` paddings pull content back out);
// `resizes-content` makes the Android keyboard shrink the layout like iOS does. Zoom stays enabled. `theme-color` is set by `themeScript`, as the theme is a class, not the OS setting.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  colorScheme: "dark light",
};

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
      {/* impeccable-live-start */}
<script nonce={nonce} src="http://localhost:8400/live.js?token=20abb03b-5b60-4403-8b32-582c835926f8"></script>
{/* impeccable-live-end */}
</body>
    </html>
  );
}
