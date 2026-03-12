import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./Layout";
import { LoginPage } from "./pages/LoginPage";
import { AgendaPage } from "./pages/AgendaPage";
import { UsersPage } from "./pages/UsersPage";
import { ChildrenPage } from "./pages/ChildrenPage";
import { RoomsPage } from "./pages/RoomsPage";
import { DevicesPage } from "./pages/DevicesPage";
import { ProtocolsPage } from "./pages/ProtocolsPage";
import { SessionPage } from "./pages/SessionPage";
import { ViewerPage } from "./pages/ViewerPage";
import { LivePublishPage } from "./pages/LivePublishPage";
import { getToken } from "../lib/auth";

function RequireAuth(props: { children: React.ReactNode }) {
  const token = getToken();
  if (!token) return <Navigate to="/login" replace />;
  return <>{props.children}</>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/viewer/:token" element={<ViewerPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/agenda" replace />} />
        <Route path="agenda" element={<AgendaPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="children" element={<ChildrenPage />} />
        <Route path="rooms" element={<RoomsPage />} />
        <Route path="devices" element={<DevicesPage />} />
        <Route path="protocols" element={<ProtocolsPage />} />
        <Route path="session/:appointmentId" element={<SessionPage />} />
        <Route path="session/:appointmentId/live" element={<LivePublishPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
