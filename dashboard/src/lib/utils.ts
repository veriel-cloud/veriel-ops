export function timeAgo(iso: string): string {
  const now = new Date();
  const date = new Date(iso);
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return `hace ${diffSecs}s`;
  if (diffMins < 60) return `hace ${diffMins}min`;
  if (diffHours < 24) {
    const mins = diffMins % 60;
    return mins > 0 ? `hace ${diffHours}h ${mins}min` : `hace ${diffHours}h`;
  }
  if (diffDays < 7) {
    const hours = diffHours % 24;
    return hours > 0 ? `hace ${diffDays}d ${hours}h` : `hace ${diffDays}d`;
  }
  return formatDate(iso);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDuration(seconds: number): string {
  if (seconds === 0) return "—";
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
