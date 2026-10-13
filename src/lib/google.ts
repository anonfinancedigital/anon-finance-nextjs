const filled = (value: string | undefined) => (value ?? "").trim() !== "";

/** True when GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are both set (blank values count as unset). */
export function isGoogleEnabled(): boolean {
  return filled(process.env.GOOGLE_CLIENT_ID) && filled(process.env.GOOGLE_CLIENT_SECRET);
}
