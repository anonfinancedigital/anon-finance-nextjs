export type SplashDevice = { width: number; height: number; ratio: number };

/** iPhones in portrait, in CSS pixels and device pixel ratio. Safari only uses the image whose media matches the device exactly. */
export const SPLASH_DEVICES: SplashDevice[] = [
  { width: 440, height: 956, ratio: 3 },
  { width: 402, height: 874, ratio: 3 },
  { width: 430, height: 932, ratio: 3 },
  { width: 393, height: 852, ratio: 3 },
  { width: 428, height: 926, ratio: 3 },
  { width: 390, height: 844, ratio: 3 },
  { width: 375, height: 812, ratio: 3 },
  { width: 414, height: 896, ratio: 3 },
  { width: 414, height: 896, ratio: 2 },
  { width: 375, height: 667, ratio: 2 },
  { width: 414, height: 736, ratio: 3 },
];

export function splashMedia({ width, height, ratio }: SplashDevice): string {
  return `(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: portrait)`;
}

export function splashFile({ width, height, ratio }: SplashDevice): string {
  return `/splash/${width * ratio}x${height * ratio}.png`;
}

/** Entries for `appleWebApp.startupImage`, one per device. */
export function startupImages(): { url: string; media: string }[] {
  return SPLASH_DEVICES.map((device) => ({ url: splashFile(device), media: splashMedia(device) }));
}
