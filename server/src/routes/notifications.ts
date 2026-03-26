import { Hono } from "hono";
import type { Env } from "../env.js";
import { getNotifications, getUnreadCount, markAsRead } from "../services/notifications.js";

export const notificationsRoutes = new Hono<Env>();

notificationsRoutes.get("/", (c) => {
  return c.json({ notifications: getNotifications(), unreadCount: getUnreadCount() });
});

notificationsRoutes.post("/:id/read", (c) => {
  const success = markAsRead(c.req.param("id"));
  return c.json({ success });
});
