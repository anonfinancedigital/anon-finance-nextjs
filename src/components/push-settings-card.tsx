"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { subscribePushAction, unsubscribePushAction, updatePushPreferencesAction } from "@/actions/push";
import { ContentCard } from "@/components/content-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { Switch } from "@/components/ui/switch";
import { SAVE_FAILED } from "@/lib/action-result";
import type { Prefs } from "@/lib/db/repos/push";
import { installHint } from "@/lib/pwa/install-hint";
import { pushUiState } from "@/lib/pwa/push-ui-state";

const STANDALONE_QUERY = "(display-mode: standalone)";
const noopSubscribe = () => () => {};

function subscribeStandalone(onChange: () => void) {
  const query = window.matchMedia(STANDALONE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

// iOS Safari reports an installed app through `navigator.standalone`, not through the media query.
function isStandalone() {
  return window.matchMedia(STANDALONE_QUERY).matches || (navigator as { standalone?: boolean }).standalone === true;
}

const isSupported = () => "serviceWorker" in navigator && "PushManager" in window;
const currentPermission = (): NotificationPermission =>
  typeof Notification === "undefined" ? "default" : Notification.permission;

/** The VAPID public key (base64url) as the bytes `pushManager.subscribe` expects. */
function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

const SWITCHES: { key: Exclude<keyof Prefs, "hour">; label: string }[] = [
  { key: "reminder", label: "Lembrete de lançar gastos" },
  { key: "due", label: "Vencimento de recorrentes" },
  { key: "security", label: "Avisos de segurança da conta" },
  { key: "admin", label: "Mensagens do administrador" },
];

const HOURS = Array.from({ length: 24 }, (_, h) => ({ value: String(h), label: `${String(h).padStart(2, "0")}:00` }));

/**
 * The "Notificações" section of /conta (PUSH-02, 04, 09, 12 to 16): turns push on and off for this browser
 * and edits which notices the user wants and at what hour. Shown only with the VAPID configuration.
 */
export function PushSettingsCard({
  publicKey,
  devices,
  prefs,
}: {
  publicKey: string;
  devices: number;
  prefs: Prefs | null;
}) {
  const supported = useSyncExternalStore(noopSubscribe, isSupported, () => true);
  const standalone = useSyncExternalStore(subscribeStandalone, isStandalone, () => true);
  const userAgent = useSyncExternalStore(noopSubscribe, () => navigator.userAgent, () => "");
  const initialPermission = useSyncExternalStore(noopSubscribe, currentPermission, () => "default" as const);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [subscribedHere, setSubscribedHere] = useState(false);
  const [draft, setDraft] = useState<Prefs | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupported()) return;
    void navigator.serviceWorker
      .getRegistration()
      .then((registration) => registration?.pushManager.getSubscription())
      .then((sub) => setSubscribedHere(Boolean(sub)))
      .catch(() => setSubscribedHere(false));
  }, []);

  const state = pushUiState({
    supported,
    standaloneIos: installHint({ userAgent, standalone, hasPrompt: false }) === "ios",
    permission: permission ?? initialPermission,
    subscribedHere,
  });
  const shownPrefs = draft ?? prefs;

  async function enable() {
    setPending(true);
    setError(null);
    let sub: PushSubscription | null = null;
    try {
      const granted = await Notification.requestPermission();
      setPermission(granted);
      // Denied: the section shows the blocked notice and nothing is stored (PUSH-04).
      if (granted !== "granted") return;
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        setError(SAVE_FAILED);
        return;
      }
      sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes(publicKey),
      });
      const result = await subscribePushAction(sub.toJSON());
      if (!result.ok) {
        // No orphan subscription in the browser when the server refused it.
        await sub.unsubscribe();
        setError(result.error);
        return;
      }
      setSubscribedHere(true);
    } catch {
      await sub?.unsubscribe().catch(() => {});
      setError(SAVE_FAILED);
    } finally {
      setPending(false);
    }
  }

  async function disable() {
    setPending(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const sub = await registration?.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        // Browser first, then the server row (PUSH-09).
        await sub.unsubscribe();
        const result = await unsubscribePushAction(endpoint);
        if (!result.ok) setError(result.error);
      }
      setSubscribedHere(false);
    } catch {
      setError(SAVE_FAILED);
    } finally {
      setPending(false);
    }
  }

  async function savePrefs(next: Prefs) {
    const previous = shownPrefs;
    setDraft(next);
    setError(null);
    const result = await updatePushPreferencesAction(next);
    if (!result.ok) {
      setDraft(previous);
      setError(result.error);
    }
  }

  return (
    <ContentCard title="Notificações" bodyClassName="space-y-4 px-6 pb-6 text-sm">
      {state === "unsupported" && <p>Este navegador não oferece notificações.</p>}
      {state === "ios-install" && <p>No iPhone, instale o app na Tela de Início para receber notificações.</p>}
      {state === "blocked" && <p>Notificações bloqueadas no navegador. Libere nas configurações do site.</p>}
      {(state === "off" || state === "on") && (
        <div className="space-y-2">
          {state === "off" ? (
            <Button type="button" disabled={pending} onClick={enable}>
              Ativar notificações
            </Button>
          ) : (
            <Button type="button" variant="outline" disabled={pending} onClick={disable}>
              Desativar notificações
            </Button>
          )}
          <p className="text-muted-foreground">
            As notificações passam pelo serviço de push do seu navegador (Google, Apple ou Mozilla). Elas só levam
            textos genéricos, nunca valores ou nomes.
          </p>
        </div>
      )}
      {devices > 0 && shownPrefs && (
        <div className="space-y-3">
          {SWITCHES.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <Label htmlFor={`push-${key}`}>{label}</Label>
              <Switch
                id={`push-${key}`}
                checked={shownPrefs[key]}
                onCheckedChange={(checked) => savePrefs({ ...shownPrefs, [key]: checked })}
              />
            </div>
          ))}
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="push-hour">Horário dos avisos diários</Label>
            <SelectField
              id="push-hour"
              className="w-28"
              value={String(shownPrefs.hour)}
              onValueChange={(value) => savePrefs({ ...shownPrefs, hour: Number(value) })}
              options={HOURS}
            />
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
    </ContentCard>
  );
}
