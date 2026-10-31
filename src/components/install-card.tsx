"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { ContentCard } from "@/components/content-card";
import { Button } from "@/components/ui/button";
import { installHint } from "@/lib/pwa/install-hint";

/** The event Chromium fires when the app can be installed; not in the DOM typings. */
type InstallPromptEvent = Event & { prompt: () => Promise<unknown> };

const STANDALONE_QUERY = "(display-mode: standalone)";

function subscribeStandalone(onChange: () => void) {
  const query = window.matchMedia(STANDALONE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

// iOS Safari reports an installed app through `navigator.standalone`, not through the media query.
function isStandalone() {
  return window.matchMedia(STANDALONE_QUERY).matches || (navigator as { standalone?: boolean }).standalone === true;
}

/** How to install the app: a button where the browser offers it, a how-to on iOS, nothing otherwise (PWA-21 to 25). */
export function InstallCard() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const standalone = useSyncExternalStore(subscribeStandalone, isStandalone, () => true);
  const userAgent = useSyncExternalStore(
    () => () => {},
    () => navigator.userAgent,
    () => "",
  );

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const hint = installHint({ userAgent, standalone, hasPrompt: prompt !== null });
  if (hint === "none") return null;

  return (
    <ContentCard title="Instalar o app" bodyClassName="space-y-3 px-6 pb-6 text-sm">
      {hint === "button" ? (
        <Button
          type="button"
          onClick={() => {
            void prompt?.prompt();
            setPrompt(null);
          }}
        >
          Instalar app
        </Button>
      ) : (
        <p>No iPhone ou iPad, toque em Compartilhar e depois em Adicionar à Tela de Início.</p>
      )}
    </ContentCard>
  );
}
