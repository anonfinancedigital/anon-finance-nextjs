// Registers the service worker. Pure: the environment and navigator come in as arguments.

type RegisterNav = {
  serviceWorker?: { register: (url: string, options: { scope: string; updateViaCache: "none" }) => Promise<unknown> };
};

/** Registers `/sw.js` in production when the browser supports it; a rejected registration is swallowed. */
export async function registerServiceWorker({
  nodeEnv,
  nav,
}: {
  nodeEnv: string | undefined;
  nav: RegisterNav;
}): Promise<void> {
  if (nodeEnv !== "production" || !nav.serviceWorker) return;
  try {
    await nav.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  } catch {
    // Offline support is optional; nothing to report to the user.
  }
}
