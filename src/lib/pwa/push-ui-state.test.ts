import { describe, expect, it } from "vitest";
import { pushUiState } from "./push-ui-state";

const PERMISSIONS = ["default", "granted", "denied"] as const;
const BOOLS = [false, true] as const;

/** Every combination of the four inputs (2 x 2 x 3 x 2 = 24). */
const ALL = BOOLS.flatMap((supported) =>
  BOOLS.flatMap((standaloneIos) =>
    PERMISSIONS.flatMap((permission) =>
      BOOLS.map((subscribedHere) => ({ supported, standaloneIos, permission, subscribedHere })),
    ),
  ),
);

describe("pushUiState", () => {
  it("covers all 24 combinations", () => {
    expect(ALL).toHaveLength(24);
  });

  it.each(ALL.filter((c) => c.standaloneIos))(
    "asks to install first on iOS outside standalone, whatever else (PUSH-12): %o",
    (input) => {
      expect(pushUiState(input)).toBe("ios-install");
    },
  );

  it.each(ALL.filter((c) => !c.standaloneIos && !c.supported))(
    "reports no support without serviceWorker or PushManager (PUSH-13): %o",
    (input) => {
      expect(pushUiState(input)).toBe("unsupported");
    },
  );

  it.each(ALL.filter((c) => !c.standaloneIos && c.supported && c.permission === "denied"))(
    "reports blocked when the permission is denied, even if subscribed (PUSH-04): %o",
    (input) => {
      expect(pushUiState(input)).toBe("blocked");
    },
  );

  it.each(ALL.filter((c) => !c.standaloneIos && c.supported && c.permission !== "denied" && c.subscribedHere))(
    "is on when this browser is subscribed (PUSH-09, PUSH-15): %o",
    (input) => {
      expect(pushUiState(input)).toBe("on");
    },
  );

  it.each(ALL.filter((c) => !c.standaloneIos && c.supported && c.permission !== "denied" && !c.subscribedHere))(
    "is off, offering to turn on, when supported, allowed and not subscribed (PUSH-02): %o",
    (input) => {
      expect(pushUiState(input)).toBe("off");
    },
  );
});
