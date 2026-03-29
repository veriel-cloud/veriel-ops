import { beforeEach, describe, expect, it, vi } from "vitest";
import { type Cache, createCache } from "../cache.js";

let cache: Cache<string>;

beforeEach(() => {
  cache = createCache<string>({ ttlMs: 1000 });
});

describe("createCache", () => {
  it("stores and retrieves a value", () => {
    cache.set("key", "value");
    expect(cache.get("key")).toBe("value");
  });

  it("returns undefined for missing key", () => {
    expect(cache.get("missing")).toBeUndefined();
  });

  it("returns undefined after TTL expires", () => {
    vi.useFakeTimers();
    cache.set("key", "value");

    vi.advanceTimersByTime(500);
    expect(cache.get("key")).toBe("value");

    vi.advanceTimersByTime(600);
    expect(cache.get("key")).toBeUndefined();

    vi.useRealTimers();
  });

  it("invalidates a specific key", () => {
    cache.set("a", "1");
    cache.set("b", "2");
    cache.invalidate("a");

    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe("2");
  });

  it("invalidates by prefix", () => {
    cache.set("project:app-a", "1");
    cache.set("project:app-b", "2");
    cache.set("deploys", "3");

    cache.invalidatePrefix("project:");

    expect(cache.get("project:app-a")).toBeUndefined();
    expect(cache.get("project:app-b")).toBeUndefined();
    expect(cache.get("deploys")).toBe("3");
  });

  it("clears all entries", () => {
    cache.set("a", "1");
    cache.set("b", "2");
    cache.clear();

    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBeUndefined();
    expect(cache.stats().size).toBe(0);
  });

  it("tracks hits and misses", () => {
    cache.set("key", "value");

    cache.get("key");
    cache.get("key");
    cache.get("missing");

    const stats = cache.stats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(1);
    expect(stats.size).toBe(1);
  });

  it("respects maxEntries", () => {
    const small = createCache<string>({ ttlMs: 10000, maxEntries: 2 });

    small.set("a", "1");
    small.set("b", "2");
    small.set("c", "3");

    expect(small.stats().size).toBe(2);
    expect(small.get("a")).toBeUndefined();
    expect(small.get("b")).toBe("2");
    expect(small.get("c")).toBe("3");
  });

  it("overwrites existing key without evicting", () => {
    const small = createCache<string>({ ttlMs: 10000, maxEntries: 2 });

    small.set("a", "1");
    small.set("b", "2");
    small.set("a", "updated");

    expect(small.stats().size).toBe(2);
    expect(small.get("a")).toBe("updated");
    expect(small.get("b")).toBe("2");
  });
});
