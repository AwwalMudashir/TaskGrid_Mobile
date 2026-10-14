type CacheLifetime<T> = number | ((value: T) => number);

type CacheEntry<T> = {
  expiresAt: number;
  value?: T;
  pending?: Promise<T>;
};

const MAX_ENTRIES = 250;
const entries = new Map<string, CacheEntry<unknown>>();

export async function readThroughCache<T>(
  key: string,
  lifetime: CacheLifetime<T>,
  loader: () => Promise<T>,
  forceRefresh = false,
): Promise<T> {
  const existing = entries.get(key) as CacheEntry<T> | undefined;
  if (!forceRefresh && existing?.pending) return existing.pending;
  if (
    !forceRefresh &&
    existing &&
    existing.expiresAt > Date.now() &&
    "value" in existing
  ) {
    return existing.value as T;
  }

  const next: CacheEntry<T> = { expiresAt: 0 };
  next.pending = loader()
    .then((value) => {
      if (entries.get(key) === next) {
        const ttl = typeof lifetime === "function" ? lifetime(value) : lifetime;
        entries.set(key, { value, expiresAt: Date.now() + Math.max(0, ttl) });
        trimOldestEntries();
      }
      return value;
    })
    .catch((error) => {
      if (entries.get(key) === next) entries.delete(key);
      throw error;
    });
  entries.set(key, next as CacheEntry<unknown>);
  return next.pending;
}

export function invalidateCachedQueries(...pathFragments: string[]) {
  if (pathFragments.length === 0) {
    entries.clear();
    return;
  }
  for (const key of entries.keys()) {
    if (pathFragments.some((fragment) => key.includes(fragment)))
      entries.delete(key);
  }
}

export function cachedQueryCount() {
  return entries.size;
}

function trimOldestEntries() {
  while (entries.size > MAX_ENTRIES) {
    const oldest = entries.keys().next().value as string | undefined;
    if (!oldest) return;
    entries.delete(oldest);
  }
}
