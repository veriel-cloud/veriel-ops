import type { WebhookEvent } from "../types.js";
import { MAX_WEBHOOK_EVENTS } from "../constants.js";

const events: WebhookEvent[] = [];
let lastUpdated = "";

export function addEvent(event: Omit<WebhookEvent, "timestamp">) {
  const entry: WebhookEvent = { ...event, timestamp: new Date().toISOString() };
  events.unshift(entry);
  if (events.length > MAX_WEBHOOK_EVENTS) events.length = MAX_WEBHOOK_EVENTS;
  lastUpdated = entry.timestamp;
}

export function getEvents(since?: string, project?: string): WebhookEvent[] {
  let filtered = events;
  if (since) filtered = filtered.filter((e) => e.timestamp > since);
  if (project) filtered = filtered.filter((e) => e.project === project);
  return filtered;
}

export function getLastUpdated(): string {
  return lastUpdated;
}
