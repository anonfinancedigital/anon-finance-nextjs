import type { Metadata, Viewport } from "next";
import { BRAND_NAME } from "@/lib/brand";

/** PWA parts of the root metadata, kept out of the layout so they can be tested. */
export const pwaMetadata = {
  appleWebApp: { capable: true, title: BRAND_NAME },
  icons: { apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }] },
} satisfies Pick<Metadata, "appleWebApp" | "icons">;

export const pwaViewport: Pick<Viewport, "themeColor"> = { themeColor: "#0D111A" };
