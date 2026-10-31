export type InstallHint = "button" | "ios" | "none";

/** What the install section of /conta shows: the install button, the iOS instruction, or nothing. */
export function installHint({
  userAgent,
  standalone,
  hasPrompt,
}: {
  userAgent: string;
  standalone: boolean;
  hasPrompt: boolean;
}): InstallHint {
  if (standalone) return "none";
  if (hasPrompt) return "button";
  return /iPhone|iPad|iPod/.test(userAgent) ? "ios" : "none";
}
