import { describe, expect, it } from "vitest";
import { decryptField, encryptField } from "@/lib/crypto/aead";
import { createDeviceKeyStore, type KeyStorageAdapter } from "./device-key";

/** In-memory stand-in for IndexedDB; the real adapter is covered by inspection (AD-005). */
function memoryAdapter(): KeyStorageAdapter & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>();
  return {
    data,
    get: async (name) => data.get(name),
    set: async (name, value) => {
      data.set(name, value);
    },
    delete: async (name) => {
      data.delete(name);
    },
  };
}

/** Adapter whose writes always fail, like IndexedDB in a private window. */
function failingAdapter(): KeyStorageAdapter {
  const fail = async () => {
    throw new Error("QuotaExceededError");
  };
  return { get: fail, set: fail, delete: fail };
}

const USER = "user-1";
const OTHER = "user-2";
const rawDek = () => crypto.getRandomValues(new Uint8Array(32));
const newKek = () => crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);

/** Proves two keys are the same AES key: what one seals, the other opens. */
async function sameKey(a: CryptoKey, b: CryptoKey): Promise<boolean> {
  const ct = await encryptField(a, "probe", "probe.aad");
  return (await decryptField(b, ct, "probe.aad")) === "probe";
}

describe("createDeviceKeyStore", () => {
  it("returns the saved DEK on load, also from a fresh store over the same storage", async () => {
    const adapter = memoryAdapter();
    const saved = await createDeviceKeyStore(adapter).save(USER, rawDek());

    const loaded = await createDeviceKeyStore(adapter).load(USER);

    expect(loaded).not.toBeNull();
    expect(await sameKey(saved, loaded!)).toBe(true);
  });

  it("clear removes the DEK from the device", async () => {
    const adapter = memoryAdapter();
    const store = createDeviceKeyStore(adapter);
    await store.save(USER, rawDek());

    await store.clear();

    expect(await store.load(USER)).toBeNull();
    expect(await createDeviceKeyStore(adapter).load(USER)).toBeNull();
  });

  it("load for another userId returns null", async () => {
    const adapter = memoryAdapter();
    await createDeviceKeyStore(adapter).save(USER, rawDek());

    expect(await createDeviceKeyStore(adapter).load(OTHER)).toBeNull();
    expect(await createDeviceKeyStore(adapter).load(USER)).not.toBeNull();
  });

  it("pendingKek.take returns the saved KEK once and removes it", async () => {
    const store = createDeviceKeyStore(memoryAdapter());
    const kek = await newKek();
    await store.pendingKek.save(kek);

    const taken = await store.pendingKek.take();

    expect(taken).not.toBeNull();
    expect(await sameKey(kek, taken!)).toBe(true);
    expect(await store.pendingKek.take()).toBeNull();
  });

  it("pendingKek.clear drops the pending KEK", async () => {
    const store = createDeviceKeyStore(memoryAdapter());
    await store.pendingKek.save(await newKek());

    await store.pendingKek.clear();

    expect(await store.pendingKek.take()).toBeNull();
  });

  it("a failing adapter does not make save throw; the DEK stays usable in memory (SIGILO-16)", async () => {
    const store = createDeviceKeyStore(failingAdapter());
    const raw = rawDek();

    const saved = await store.save(USER, raw);
    const loaded = await store.load(USER);

    expect(loaded).not.toBeNull();
    expect(await sameKey(saved, loaded!)).toBe(true);
    await expect(store.pendingKek.save(await newKek())).resolves.toBeUndefined();
    await expect(store.clear()).resolves.toBeUndefined();
    expect(await store.load(USER)).toBeNull();
  });

  it("keys the store hands back are not extractable, even from an extractable input", async () => {
    const adapter = memoryAdapter();
    const extractable = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);

    const fromBytes = await createDeviceKeyStore(adapter).save(USER, rawDek());
    const fromKey = await createDeviceKeyStore(adapter).save(USER, extractable);
    const loaded = await createDeviceKeyStore(adapter).load(USER);

    expect(fromBytes.extractable).toBe(false);
    expect(fromKey.extractable).toBe(false);
    expect(loaded!.extractable).toBe(false);
    expect(await sameKey(extractable, loaded!)).toBe(true);
    const stored = adapter.data.get("dek") as { key: CryptoKey };
    expect(stored.key.extractable).toBe(false);
  });
});
