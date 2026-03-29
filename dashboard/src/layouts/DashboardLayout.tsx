import { Outlet, useNavigate } from "react-router-dom";
import { NotificationBell } from "@/components/NotificationBell";
import { Sidebar } from "@/components/Sidebar";
import { clearStoredToken } from "@/lib/api";

export function DashboardLayout() {
  const navigate = useNavigate();

  function handleLogout() {
    clearStoredToken();
    navigate("/login");
  }

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <Sidebar />
      <main className="flex-1 ml-[200px]">
        <div className="flex items-center justify-end gap-3 px-8 pt-4">
          <NotificationBell />
          <button
            type="button"
            onClick={handleLogout}
            className="text-[11px] text-[var(--color-text-quaternary)] hover:text-[var(--color-text-secondary)] transition-colors"
          >
            Logout
          </button>
        </div>
        <div className="max-w-[1200px] mx-auto px-8 pb-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
