import { LOGIN_BLOCK_MESSAGE } from "@/lib/domain/user-status";

const GOOGLE_FAILED = "Não foi possível entrar com o Google";

function isBlockStatus(value: string | undefined): value is keyof typeof LOGIN_BLOCK_MESSAGE {
  return value !== undefined && Object.hasOwn(LOGIN_BLOCK_MESSAGE, value);
}

/**
 * Notice to show on /login after a Google sign-in. `blockStatus` is the value of the
 * `anon_login_block` cookie and `error` the `?error=` query value; unknown cookie values are ignored.
 */
export function loginNotice(input: { blockStatus: string | undefined; error: string | undefined }): string | null {
  if (isBlockStatus(input.blockStatus)) return LOGIN_BLOCK_MESSAGE[input.blockStatus];
  return input.error ? GOOGLE_FAILED : null;
}
