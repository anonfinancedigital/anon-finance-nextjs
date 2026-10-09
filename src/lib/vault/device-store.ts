import { createDeviceKeyStore, indexedDbAdapter } from "./device-key";

/**
 * The one device key store of the browser. Provider, login, sign-out and account deletion share
 * this instance, so the in-memory copy of the DEK and of the pending KEK is the same everywhere.
 */
export const deviceKey = createDeviceKeyStore(indexedDbAdapter());
