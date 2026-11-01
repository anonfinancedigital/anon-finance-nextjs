import type { Metadata, Viewport } from "next";
import { APP_NAME } from "@/lib/brand";
import { startupImages } from "./splash-list";

/** PWA parts of the root metadata, kept out of the layout so they can be tested. */
export const pwaMetadata = {
  appleWebApp: { capable: true, title: APP_NAME, startupImage: startupImages() },
  icons: { apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }] },
  // Next emits only `mobile-web-app-capable`; iOS applies the startup images to apps flagged with the Apple name.
  other: { "apple-mobile-web-app-capable": "yes" },
} satisfies Pick<Metadata, "appleWebApp" | "icons" | "other">;

export const pwaViewport: Pick<Viewport, "themeColor"> = { themeColor: "#0D111A" };
