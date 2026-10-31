import { describe, expect, it } from "vitest";
import { pwaMetadata, pwaViewport } from "./metadata";

describe("pwaMetadata (PWA-03)", () => {
  it("makes the iOS home-screen app capable, titled Anon Finance (APPNAME-02)", () => {
    expect(pwaMetadata.appleWebApp).toMatchObject({ capable: true, title: "Anon Finance" });
  });

  it("declares the 180x180 Apple touch icon", () => {
    expect(pwaMetadata.icons).toEqual({
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    });
  });
});

describe("pwaViewport (PWA-04)", () => {
  it("sets the theme color to the brand dark", () => {
    expect(pwaViewport.themeColor).toBe("#0D111A");
  });
});
