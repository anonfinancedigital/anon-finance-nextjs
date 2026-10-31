import { describe, expect, it } from "vitest";
import { installHint } from "./install-hint";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1";
const IPAD = "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1";
const IPOD = "Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36";
const DESKTOP = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36";

describe("installHint", () => {
  it.each([
    ["iPhone", IPHONE],
    ["iPad", IPAD],
    ["iPod", IPOD],
  ])("shows the iOS instruction on %s outside standalone (PWA-23)", (_name, userAgent) => {
    expect(installHint({ userAgent, standalone: false, hasPrompt: false })).toBe("ios");
  });

  it("shows the button once the install prompt was kept (PWA-21)", () => {
    expect(installHint({ userAgent: ANDROID, standalone: false, hasPrompt: true })).toBe("button");
    expect(installHint({ userAgent: DESKTOP, standalone: false, hasPrompt: true })).toBe("button");
  });

  it("shows nothing when already installed, even on iOS or with a prompt (PWA-24)", () => {
    expect(installHint({ userAgent: IPHONE, standalone: true, hasPrompt: false })).toBe("none");
    expect(installHint({ userAgent: ANDROID, standalone: true, hasPrompt: true })).toBe("none");
  });

  it("shows nothing on Android or desktop without a prompt (PWA-25)", () => {
    expect(installHint({ userAgent: ANDROID, standalone: false, hasPrompt: false })).toBe("none");
    expect(installHint({ userAgent: DESKTOP, standalone: false, hasPrompt: false })).toBe("none");
  });
});
