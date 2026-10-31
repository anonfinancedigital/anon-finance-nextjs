// Push configuration read from the environment. Pure: the environment comes in as an argument.

type Env = Record<string, string | undefined>;

export type PushConfig = { publicKey: string; privateKey: string; subject: string };

/** The VAPID settings, or `null` when any is missing or the subject is not a `mailto:` or `https:` URI. */
export function resolvePushConfig(env: Env): PushConfig | null {
  const publicKey = env.VAPID_PUBLIC_KEY;
  const privateKey = env.VAPID_PRIVATE_KEY;
  const subject = env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return null;
  if (!subject.startsWith("mailto:") && !subject.startsWith("https:")) return null;
  return { publicKey, privateKey, subject };
}

/** The shared secret the hourly dispatch authenticates with, or `null` when unset or empty. */
export function resolveCronSecret(env: Env): string | null {
  return env.CRON_SECRET || null;
}
