import { Hono } from "hono";
import type { Env } from "../env.js";

export const notificationsRoutes = new Hono<Env>();

notificationsRoutes.get("/", (c) => {
  const store = c.get("store");
  return c.json({ notifications: store.getNotifications(), unreadCount: store.getUnreadCount() });
});

notificationsRoutes.post("/:id/read", (c) => {
  const store = c.get("store");
  const success = store.markAsRead(c.req.param("id"));
  return c.json({ success });
});
