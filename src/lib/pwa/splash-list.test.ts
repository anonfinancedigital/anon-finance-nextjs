import { describe, expect, it } from "vitest";
import { SPLASH_DEVICES, splashFile, splashMedia, startupImages } from "./splash-list";

describe("splash list (SPLASH-02, SPLASH-05)", () => {
  it("lists the 11 portrait iPhones of the design", () => {
    expect(SPLASH_DEVICES.map((d) => `${d.width}x${d.height}@${d.ratio}`)).toEqual([
      "440x956@3",
      "402x874@3",
      "430x932@3",
      "393x852@3",
      "428x926@3",
      "390x844@3",
      "375x812@3",
      "414x896@3",
      "414x896@2",
      "375x667@2",
      "414x736@3",
    ]);
  });

  it("builds the exact portrait media query", () => {
    expect(splashMedia({ width: 390, height: 844, ratio: 3 })).toBe(
      "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
    );
  });

  it("names the file after the pixel size W*R by H*R", () => {
    expect(splashFile({ width: 390, height: 844, ratio: 3 })).toBe("/splash/1170x2532.png");
    expect(splashFile({ width: 375, height: 667, ratio: 2 })).toBe("/splash/750x1334.png");
  });

  it("gives one startup image per device with a url under /splash/", () => {
    const images = startupImages();
    expect(images).toHaveLength(SPLASH_DEVICES.length);
    images.forEach((image, i) => {
      expect(image.url.startsWith("/splash/")).toBe(true);
      expect(image).toEqual({ url: splashFile(SPLASH_DEVICES[i]), media: splashMedia(SPLASH_DEVICES[i]) });
    });
  });

  it("never repeats a media query or a file", () => {
    const images = startupImages();
    expect(new Set(images.map((i) => i.media)).size).toBe(images.length);
    expect(new Set(images.map((i) => i.url)).size).toBe(images.length);
  });
});
