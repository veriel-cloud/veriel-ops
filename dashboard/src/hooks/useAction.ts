import { useCallback, useState } from "react";
import { api } from "@/lib/api";

interface UseActionResult<TRes> {
  execute: (body: unknown) => Promise<TRes | null>;
  loading: boolean;
  error: string | null;
}

export function useAction<TRes = unknown>(path: string): UseActionResult<TRes> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (body: unknown): Promise<TRes | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await api.post<TRes>(path, body);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [path],
  );

  return { execute, loading, error };
}
