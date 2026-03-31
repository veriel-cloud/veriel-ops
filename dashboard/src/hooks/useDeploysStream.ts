import { useEffect, useRef, useState } from "react";
import { getStoredToken } from "@/lib/api";
import type { DeployEntry } from "@veriel-ops/shared";

function parseSSELines(
  buffer: string,
  onEvent: (event: string, data: string) => void,
): string {
  const lines = buffer.split("\n");
  const rest = lines.pop() ?? "";
  let currentEvent = "update";

  for (const line of lines) {
    if (line.startsWith("event:")) {
      currentEvent = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      onEvent(currentEvent, line.slice(5).trim());
      currentEvent = "update";
    }
  }

  return rest;
}

/**
 * SSE-only hook for deploys — same pattern as New Project.
 *
 * Opens a persistent SSE stream on mount. The server emits deploy snapshots:
 * - Fast (5s) when active deploys exist (tracked via GitHub webhooks)
 * - Slow (30s) when idle (uses cached data, no extra GitHub API calls)
 *
 * Stream stays open until unmount.
 */
export function useDeploysStream() {
  const [deploys, setDeploys] = useState<DeployEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    abortRef.current = controller;

    async function connect() {
      try {
        const token = getStoredToken();
        const response = await fetch("/api/deploys/stream", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          if (mounted) {
            setError(new Error(`HTTP ${response.status}`));
            setIsLoading(false);
          }
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          buffer = parseSSELines(buffer, (event, jsonStr) => {
            if (event === "update" && jsonStr && mounted) {
              try {
                setDeploys(JSON.parse(jsonStr));
                setIsLoading(false);
              } catch {
                /* ignore */
              }
            }
          });
        }
      } catch {
        // Abort errors are expected (unmount)
        if (mounted && !controller.signal.aborted) {
          setError(new Error("Stream disconnected"));
          setIsLoading(false);
        }
      }
    }

    connect();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);

  const hasActive = deploys.some((d) => d.status === "in_progress");

  return { deploys, isLoading, error, hasActive };
}
