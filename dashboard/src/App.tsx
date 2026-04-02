import { Navigate, Route, Routes } from "react-router-dom";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { getStoredToken } from "./lib/api";
import { Dashboard } from "./pages/Dashboard";
import { Deploys } from "./pages/Deploys";
import { FileEditor } from "./pages/FileEditor";
import { ImportProject } from "./pages/ImportProject";
import { Login } from "./pages/Login";
import { NewProject } from "./pages/NewProject";
import { ProjectDetail } from "./pages/ProjectDetail";
import { Projects } from "./pages/Projects";
import { AuditLog } from "./pages/AuditLog";
import { Settings } from "./pages/Settings";

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!getStoredToken()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/new" element={<NewProject />} />
        <Route path="/projects/import" element={<ImportProject />} />
        <Route path="/projects/:name" element={<ProjectDetail />} />
        <Route path="/projects/:name/editor" element={<FileEditor />} />
        <Route path="/deploys" element={<Deploys />} />
        <Route path="/audit" element={<AuditLog />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
