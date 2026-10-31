export type PushUiState = "unsupported" | "ios-install" | "blocked" | "off" | "on";

/**
 * What the notification section of /conta shows. `standaloneIos` is an iPhone/iPad outside standalone
 * mode (`installHint` answers "ios"): there iOS offers no push until the app is installed, so the install
 * instruction wins over everything (PUSH-12). Then no support (PUSH-13), then a denied permission
 * (PUSH-04), then whether this browser is subscribed.
 */
export function pushUiState({
  supported,
  standaloneIos,
  permission,
  subscribedHere,
}: {
  supported: boolean;
  standaloneIos: boolean;
  permission: NotificationPermission;
  subscribedHere: boolean;
}): PushUiState {
  if (standaloneIos) return "ios-install";
  if (!supported) return "unsupported";
  if (permission === "denied") return "blocked";
  return subscribedHere ? "on" : "off";
}
