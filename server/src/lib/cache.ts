interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

interface CacheOptions {
  ttlMs: number;
  maxEntries?: number;
}

interface CacheStats {
  size: number;
  hits: number;
  misses: number;
}

export interface Cache<T> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
  invalidate(key: string): void;
  invalidatePrefix(prefix: string): void;
  clear(): void;
  stats(): CacheStats;
}

export function createCache<T>(options: CacheOptions): Cache<T> {
  const store = new Map<string, CacheEntry<T>>();
  let hits = 0;
  let misses = 0;

  function get(key: string): T | undefined {
    const entry = store.get(key);
    if (!entry) {
      misses++;
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      store.delete(key);
      misses++;
      return undefined;
    }

    hits++;
    return entry.data;
  }

  function set(key: string, value: T): void {
    if (options.maxEntries && store.size >= options.maxEntries && !store.has(key)) {
      const oldest = store.keys().next().value;
      if (oldest) store.delete(oldest);
    }

    store.set(key, {
      data: value,
      expiresAt: Date.now() + options.ttlMs,
    });
  }

  function invalidate(key: string): void {
    store.delete(key);
  }

  function invalidatePrefix(prefix: string): void {
    for (const key of store.keys()) {
      if (key.startsWith(prefix)) {
        store.delete(key);
      }
    }
  }

  function clear(): void {
    store.clear();
    hits = 0;
    misses = 0;
  }

  function stats(): CacheStats {
    return { size: store.size, hits, misses };
  }

  return { get, set, invalidate, invalidatePrefix, clear, stats };
}
