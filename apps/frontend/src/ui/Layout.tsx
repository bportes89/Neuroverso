import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { clearToken } from "../lib/auth";

const navLinkStyle = (isActive: boolean): React.CSSProperties => ({
  padding: "10px 12px",
  borderRadius: 10,
  textDecoration: "none",
  color: isActive ? "#0b1020" : "#dbe6ff",
  background: isActive ? "#dbe6ff" : "transparent"
});

export function Layout() {
  const navigate = useNavigate();
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(1200px 900px at 20% 10%, #2b6cb0 0%, #0b1020 55%, #050812 100%)",
        color: "#dbe6ff",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif"
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid rgba(219,230,255,0.12)",
          backdropFilter: "blur(8px)",
          background: "rgba(5,8,18,0.4)"
        }}
      >
        <Link to="/agenda" style={{ color: "#dbe6ff", textDecoration: "none", fontWeight: 700 }}>
          Neuroverso
        </Link>
        <nav style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          <NavLink to="/agenda" style={({ isActive }) => navLinkStyle(isActive)}>
            Agenda
          </NavLink>
          <NavLink to="/users" style={({ isActive }) => navLinkStyle(isActive)}>
            Usuários
          </NavLink>
          <NavLink to="/children" style={({ isActive }) => navLinkStyle(isActive)}>
            Crianças
          </NavLink>
          <NavLink to="/rooms" style={({ isActive }) => navLinkStyle(isActive)}>
            Salas
          </NavLink>
          <NavLink to="/devices" style={({ isActive }) => navLinkStyle(isActive)}>
            Dispositivos
          </NavLink>
          <NavLink to="/protocols" style={({ isActive }) => navLinkStyle(isActive)}>
            Protocolos
          </NavLink>
        </nav>
        <button
          onClick={() => {
            clearToken();
            navigate("/login");
          }}
          style={{
            border: "1px solid rgba(219,230,255,0.2)",
            background: "rgba(219,230,255,0.08)",
            color: "#dbe6ff",
            padding: "10px 12px",
            borderRadius: 10,
            cursor: "pointer"
          }}
        >
          Sair
        </button>
      </header>
      <main style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
        <Outlet />
      </main>
      <footer style={{ padding: "10px 20px", opacity: 0.7, textAlign: "center" }}>
        <span>Neuroverso</span>
      </footer>
    </div>
  );
}
