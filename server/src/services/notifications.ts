interface Notification {
  id: string;
  type: "deploy_failed" | "deploy_success" | "coverage_low" | "workflow_failed";
  project: string;
  message: string;
  timestamp: string;
  read: boolean;
}

const notifications: Notification[] = [];
let idCounter = 0;

export function addNotification(type: Notification["type"], project: string, message: string) {
  idCounter++;
  notifications.unshift({
    id: String(idCounter),
    type,
    project,
    message,
    timestamp: new Date().toISOString(),
    read: false,
  });
  if (notifications.length > 50) notifications.length = 50;
}

export function getNotifications(): Notification[] {
  return notifications;
}

export function markAsRead(id: string): boolean {
  const n = notifications.find((n) => n.id === id);
  if (n) {
    n.read = true;
    return true;
  }
  return false;
}

export function getUnreadCount(): number {
  return notifications.filter((n) => !n.read).length;
}
