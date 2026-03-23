import { Routes, Route } from "react-router-dom";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { Dashboard } from "./pages/Dashboard";
import { Projects } from "./pages/Projects";
import { ProjectDetail } from "./pages/ProjectDetail";
import { NewProject } from "./pages/NewProject";
import { Deploys } from "./pages/Deploys";
import { Settings } from "./pages/Settings";

export function App() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/new" element={<NewProject />} />
        <Route path="/projects/:name" element={<ProjectDetail />} />
        <Route path="/deploys" element={<Deploys />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
