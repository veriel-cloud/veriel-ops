import { Outlet, useNavigate } from "react-router-dom";
import { NotificationBell } from "@/components/NotificationBell";
import { Sidebar } from "@/components/Sidebar";
import { SidebarProvider, useSidebar } from "@/lib/sidebar-context";
import { clearStoredToken } from "@/lib/api";

function LayoutInner() {
  const navigate = useNavigate();
  const { collapsed } = useSidebar();

  function handleLogout() {
    clearStoredToken();
    navigate("/login");
  }

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <Sidebar />
      <main className={`flex-1 transition-[margin] duration-200 ${collapsed ? "ml-[56px]" : "ml-[200px]"}`}>
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

export function DashboardLayout() {
  return (
    <SidebarProvider>
      <LayoutInner />
    </SidebarProvider>
  );
}
