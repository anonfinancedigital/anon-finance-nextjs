import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

const SOURCE = readFileSync(join(process.cwd(), "public", "sw.js"), "utf8");
const ORIGIN = "https://anon.example";

type Listener = (event: Record<string, unknown>) => void;
type FakeResponse = { status: number; tag: string; clone: () => FakeResponse };

const response = (status: number, tag = `r${status}`): FakeResponse => {
  const r: FakeResponse = { status, tag, clone: () => ({ ...r }) };
  return r;
};

/** Loads public/sw.js in a vm with a simulated service worker scope and an in-memory Cache Storage. */
function loadWorker(options: { fetchImpl?: (req: unknown) => Promise<FakeResponse> } = {}) {
  const listeners: Record<string, Listener> = {};
  const stores = new Map<string, Map<string, FakeResponse>>();
  const addAllCalls: { cache: string; urls: string[] }[] = [];
  const keyOf = (req: unknown) => (typeof req === "string" ? req : (req as { url: string }).url);

  const openCache = (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name)!;
    return {
      match: async (req: unknown) => store.get(keyOf(req)),
      put: vi.fn(async (req: unknown, res: FakeResponse) => void store.set(keyOf(req), res)),
      addAll: async (urls: string[]) => {
        addAllCalls.push({ cache: name, urls });
        for (const u of urls) store.set(u, response(200, u));
      },
    };
  };
  const cacheHandles = new Map<string, ReturnType<typeof openCache>>();
  const open = async (name: string) => {
    if (!cacheHandles.has(name)) cacheHandles.set(name, openCache(name));
    return cacheHandles.get(name)!;
  };

  const claim = vi.fn(async () => {});
  const skipWaiting = vi.fn(async () => {});
  const network = vi.fn(options.fetchImpl ?? (async () => response(200, "network")));
  const errorResponse = { tag: "Response.error()" };

  const self = {
    location: { origin: ORIGIN },
    clients: { claim },
    skipWaiting,
    addEventListener: (type: string, fn: Listener) => void (listeners[type] = fn),
  };
  const caches = {
    open,
    keys: async () => [...stores.keys()],
    delete: vi.fn(async (name: string) => stores.delete(name)),
    match: async () => undefined,
  };
  vm.runInNewContext(SOURCE, {
    self,
    caches,
    fetch: network,
    clients: self.clients,
    URL,
    Promise,
    Response: { error: () => errorResponse },
    console,
  });

  const waitUntilPromises: Promise<unknown>[] = [];
  const lifecycle = async (type: "install" | "activate") => {
    listeners[type]({ waitUntil: (p: Promise<unknown>) => waitUntilPromises.push(p) });
    await Promise.all(waitUntilPromises.splice(0));
  };
  const dispatchFetch = async (req: { url: string; method?: string; mode?: string }) => {
    let responded: Promise<unknown> | undefined;
    listeners.fetch({
      request: { method: "GET", mode: "cors", ...req },
      respondWith: (p: Promise<unknown>) => (responded = p),
    });
    return { intercepted: responded !== undefined, result: responded ? await responded : undefined };
  };
  return { stores, cacheHandles, addAllCalls, claim, skipWaiting, network, caches, errorResponse, lifecycle, dispatchFetch, open };
}

describe("service worker install (PWA-07, PWA-14)", () => {
  it("precaches exactly the offline page and the two icons in anon-static-v1", async () => {
    const sw = loadWorker();
    await sw.lifecycle("install");
    expect(sw.addAllCalls).toEqual([
      { cache: "anon-static-v1", urls: ["/offline.html", "/icon-192.png", "/icon-512.png"] },
    ]);
  });

  it("calls skipWaiting once installed", async () => {
    const sw = loadWorker();
    await sw.lifecycle("install");
    expect(sw.skipWaiting).toHaveBeenCalledTimes(1);
  });
});

describe("service worker activate (PWA-08, PWA-14)", () => {
  it("deletes every cache except anon-static-v1", async () => {
    const sw = loadWorker();
    await sw.open("anon-static-v0");
    await sw.open("anon-static-v1");
    await sw.open("other-cache");
    sw.stores.get("anon-static-v1")!.set("/offline.html", response(200));
    await sw.lifecycle("activate");
    expect([...sw.stores.keys()]).toEqual(["anon-static-v1"]);
    expect(sw.stores.get("anon-static-v1")!.has("/offline.html")).toBe(true);
  });

  it("claims the open clients", async () => {
    const sw = loadWorker();
    await sw.lifecycle("activate");
    expect(sw.claim).toHaveBeenCalledTimes(1);
  });
});

describe("service worker fetch of /_next/static/ (PWA-09)", () => {
  const url = `${ORIGIN}/_next/static/chunks/app-abc.js`;

  it("answers from the cache when present, without touching the network", async () => {
    const sw = loadWorker();
    const cached = response(200, "cached");
    (await sw.open("anon-static-v1")).put(url, cached);
    const { intercepted, result } = await sw.dispatchFetch({ url });
    expect(intercepted).toBe(true);
    expect(result).toBe(cached);
    expect(sw.network).not.toHaveBeenCalled();
  });

  it("fetches from the network on a miss and stores a 200 response", async () => {
    const sw = loadWorker({ fetchImpl: async () => response(200, "fresh") });
    const { result } = await sw.dispatchFetch({ url });
    expect((result as FakeResponse).tag).toBe("fresh");
    expect(sw.stores.get("anon-static-v1")!.get(url)?.tag).toBe("fresh");
  });

  it("returns a non-200 response without storing it (edge case)", async () => {
    const sw = loadWorker({ fetchImpl: async () => response(404, "missing") });
    const { result } = await sw.dispatchFetch({ url });
    expect((result as FakeResponse).tag).toBe("missing");
    expect(sw.stores.get("anon-static-v1")?.has(url) ?? false).toBe(false);
  });
});

describe("service worker navigation (PWA-10, PWA-11)", () => {
  const nav = { url: `${ORIGIN}/conta`, mode: "navigate" };

  it("serves the cached offline page when the network fails", async () => {
    const sw = loadWorker({ fetchImpl: async () => Promise.reject(new TypeError("offline")) });
    await sw.lifecycle("install");
    const { intercepted, result } = await sw.dispatchFetch(nav);
    expect(intercepted).toBe(true);
    expect((result as FakeResponse).tag).toBe("/offline.html");
  });

  it("returns Response.error() when the cache lacks /offline.html (edge case)", async () => {
    const sw = loadWorker({ fetchImpl: async () => Promise.reject(new TypeError("offline")) });
    const { result } = await sw.dispatchFetch(nav);
    expect(result).toBe(sw.errorResponse);
  });

  it.each([200, 404, 500])("returns a %i response as is and never stores it", async (status) => {
    const page = response(status, "page");
    const sw = loadWorker({ fetchImpl: async () => page });
    const { result } = await sw.dispatchFetch(nav);
    expect(result).toBe(page);
    expect(sw.stores.get("anon-static-v1")?.has(nav.url) ?? false).toBe(false);
    for (const handle of sw.cacheHandles.values()) expect(handle.put).not.toHaveBeenCalled();
  });
});

describe("service worker leaves everything else to the browser (PWA-12)", () => {
  it.each([
    ["a POST to a static path", { url: `${ORIGIN}/_next/static/x.js`, method: "POST" }],
    ["a POST navigation (Server Action)", { url: `${ORIGIN}/conta`, method: "POST", mode: "navigate" }],
    ["a cross-origin static asset", { url: "https://cdn.example/_next/static/x.js" }],
    ["a cross-origin navigation", { url: "https://other.example/", mode: "navigate" }],
    ["an API GET", { url: `${ORIGIN}/api/health` }],
    ["a Better Auth GET", { url: `${ORIGIN}/api/auth/get-session` }],
    ["the Sentry tunnel", { url: `${ORIGIN}/monitoring` }],
    ["an RSC fetch", { url: `${ORIGIN}/conta?_rsc=abc` }],
    ["another same-origin GET", { url: `${ORIGIN}/icon-192.png` }],
  ])("does not intercept %s", async (_name, req) => {
    const sw = loadWorker();
    const { intercepted } = await sw.dispatchFetch(req);
    expect(intercepted).toBe(false);
    expect(sw.network).not.toHaveBeenCalled();
  });
});
