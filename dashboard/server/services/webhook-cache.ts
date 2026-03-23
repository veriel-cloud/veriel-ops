interface WebhookEvent {
  id: string;
  source: "github" | "cloudflare";
  type: string;
  project: string;
  data: Record<string, unknown>;
  timestamp: string;
}

const MAX_EVENTS = 100;
const events: WebhookEvent[] = [];
let lastUpdated = new Date().toISOString();

export function addEvent(event: Omit<WebhookEvent, "id" | "timestamp">) {
  const entry: WebhookEvent = {
    ...event,
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  };

  events.unshift(entry);

  if (events.length > MAX_EVENTS) {
    events.length = MAX_EVENTS;
  }

  lastUpdated = entry.timestamp;
}

export function getEvents(since?: string): WebhookEvent[] {
  if (!since) return events;
  const sinceDate = new Date(since).getTime();
  return events.filter((e) => new Date(e.timestamp).getTime() > sinceDate);
}

export function getLastUpdated(): string {
  return lastUpdated;
}

export function getRecentEventsByProject(project: string, limit = 10): WebhookEvent[] {
  return events.filter((e) => e.project === project).slice(0, limit);
}
