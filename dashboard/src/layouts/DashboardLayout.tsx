import { Outlet } from "react-router-dom";
import { NotificationBell } from "@/components/NotificationBell";
import { Sidebar } from "@/components/Sidebar";

export function DashboardLayout() {
  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <Sidebar />
      <main className="flex-1 ml-[200px]">
        <div className="flex justify-end px-8 pt-4">
          <NotificationBell />
        </div>
        <div className="max-w-[1200px] mx-auto px-8 pb-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
