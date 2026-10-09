/** Where the store keeps its values. Values are structured-cloned, so a `CryptoKey` survives as is. */
export interface KeyStorageAdapter {
  get(name: string): Promise<unknown>;
  set(name: string, value: unknown): Promise<void>;
  delete(name: string): Promise<void>;
}

export interface DeviceKeyStore {
  /** The DEK saved for `userId`, or `null` (none, another user's, or storage unavailable). */
  load(userId: string): Promise<CryptoKey | null>;
  /** Keeps the DEK as a non-extractable key and returns it. Never throws: storage failure leaves it in memory. */
  save(userId: string, dek: Uint8Array | CryptoKey): Promise<CryptoKey>;
  /** Removes the DEK from the device. */
  clear(): Promise<void>;
  /** KEK derived before sign-in, consumed once the session exists (design: "KEK pendente"). */
  pendingKek: {
    save(kek: CryptoKey): Promise<void>;
    take(): Promise<CryptoKey | null>;
    clear(): Promise<void>;
  };
}

type StoredDek = { userId: string; key: CryptoKey };

const DEK = "dek";
const PENDING_KEK = "pending-kek";

async function nonExtractable(dek: Uint8Array | CryptoKey): Promise<CryptoKey> {
  if (dek instanceof Uint8Array || dek.extractable) {
    const raw = dek instanceof Uint8Array ? new Uint8Array(dek) : await crypto.subtle.exportKey("raw", dek);
    return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
  }
  return dek;
}

/** Runs a storage call; a failing storage (private window, blocked site data) counts as empty. */
async function attempt<T>(call: () => Promise<T>): Promise<T | undefined> {
  try {
    return await call();
  } catch {
    return undefined;
  }
}

/**
 * Device-side keys (SIGILO-16). Each value is also kept in memory, so the session keeps working in
 * this tab when the storage refuses to write.
 */
export function createDeviceKeyStore(adapter: KeyStorageAdapter): DeviceKeyStore {
  let dekInMemory: StoredDek | null = null;
  let kekInMemory: CryptoKey | null = null;

  return {
    async load(userId) {
      const stored = dekInMemory ?? ((await attempt(() => adapter.get(DEK))) as StoredDek | undefined);
      return stored?.userId === userId ? stored.key : null;
    },
    async save(userId, dek) {
      const key = await nonExtractable(dek);
      dekInMemory = { userId, key };
      await attempt(() => adapter.set(DEK, { userId, key } satisfies StoredDek));
      return key;
    },
    async clear() {
      dekInMemory = null;
      await attempt(() => adapter.delete(DEK));
    },
    pendingKek: {
      async save(kek) {
        kekInMemory = kek;
        await attempt(() => adapter.set(PENDING_KEK, kek));
      },
      async take() {
        const kek = kekInMemory ?? ((await attempt(() => adapter.get(PENDING_KEK))) as CryptoKey | undefined) ?? null;
        kekInMemory = null;
        await attempt(() => adapter.delete(PENDING_KEK));
        return kek;
      },
      async clear() {
        kekInMemory = null;
        await attempt(() => adapter.delete(PENDING_KEK));
      },
    },
  };
}

const DB_NAME = "orcamento-vault";
const STORE_NAME = "keys";

function request<T>(open: (store: IDBObjectStore) => IDBRequest<T>, db: IDBDatabase, mode: IDBTransactionMode) {
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const req = open(tx.objectStore(STORE_NAME));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/**
 * IndexedDB storage for the browser. Opens the database on first use, never at import, so the module
 * loads in Node. Not covered by unit tests (AD-005).
 */
export function indexedDbAdapter(): KeyStorageAdapter {
  let db: Promise<IDBDatabase> | null = null;
  const openDb = () =>
    (db ??= new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        db = null;
        reject(req.error);
      };
    }));

  return {
    get: async (name) => request((store) => store.get(name), await openDb(), "readonly"),
    set: async (name, value) => {
      await request((store) => store.put(value, name), await openDb(), "readwrite");
    },
    delete: async (name) => {
      await request((store) => store.delete(name), await openDb(), "readwrite");
    },
  };
}
