import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useNotifications } from "@/hooks/queries";
import { useMarkNotificationRead } from "@/hooks/mutations";
import { cn, timeAgo } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  project: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export function NotificationBell() {
  const { data } = useNotifications();
  const markRead = useMarkNotificationRead();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const notifications = (data?.notifications ?? []) as Notification[];
  const unreadCount = data?.unreadCount ?? 0;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleMarkRead(id: string) {
    markRead.mutate(id);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative p-1.5 rounded-md text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2-3v-3a7 7 0 0 1 4-6" />
          <path d="M9 17v1a3 3 0 0 0 6 0v-1" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[var(--color-error)] text-white text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-2xl shadow-black/50 z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-[var(--color-border)]">
            <p className="text-[12px] font-medium text-[var(--color-text-primary)]">Notifications</p>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-3 py-6 text-center text-[12px] text-[var(--color-text-quaternary)]">No notifications</p>
            ) : (
              notifications.slice(0, 15).map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "px-3 py-2.5 border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg-hover)] transition-colors",
                    !n.read && "bg-[var(--color-accent)]/5",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        to={`/projects/${n.project}`}
                        onClick={() => {
                          handleMarkRead(n.id);
                          setOpen(false);
                        }}
                        className="text-[12px] text-[var(--color-text-primary)] hover:underline block truncate"
                      >
                        {n.message}
                      </Link>
                      <p className="text-[10px] text-[var(--color-text-quaternary)] mt-0.5">
                        {n.project} · {timeAgo(n.timestamp)}
                      </p>
                    </div>
                    {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] flex-shrink-0 mt-1.5" />}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
