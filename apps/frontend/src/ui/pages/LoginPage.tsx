import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, type ApiError } from "../../lib/api";
import { setToken } from "../../lib/auth";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@neuroverso.local");
  const [password, setPassword] = useState("adminadmin");
  const [name, setName] = useState("Admin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(() => "Entrar", []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ token: string }>(`/auth/login`, {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      setToken(res.token);
      navigate("/agenda");
    } catch (err) {
      const msg = (err as ApiError)?.message ?? "Falha ao autenticar";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const bootstrap = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ token: string }>(`/auth/register`, {
        method: "POST",
        body: JSON.stringify({ email, name, password })
      });
      setToken(res.token);
      navigate("/agenda");
    } catch (err) {
      const msg = (err as ApiError)?.message ?? "Falha ao bootstrap";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "radial-gradient(1100px 850px at 30% 10%, #2b6cb0 0%, #0b1020 55%, #050812 100%)",
        color: "#dbe6ff",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif"
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: 420,
          padding: 22,
          borderRadius: 18,
          background: "rgba(5,8,18,0.55)",
          border: "1px solid rgba(219,230,255,0.18)",
          boxShadow: "0 18px 60px rgba(0,0,0,0.35)"
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <h1 style={{ margin: 0, fontSize: 22 }}>Neuroverso</h1>
          <span style={{ opacity: 0.8 }}>{title}</span>
        </div>

        <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, opacity: 0.85 }}>Nome (bootstrap)</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(219,230,255,0.2)",
                background: "rgba(219,230,255,0.06)",
                color: "#dbe6ff",
                outline: "none"
              }}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, opacity: 0.85 }}>E-mail</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(219,230,255,0.2)",
                background: "rgba(219,230,255,0.06)",
                color: "#dbe6ff",
                outline: "none"
              }}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, opacity: 0.85 }}>Senha</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              minLength={8}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(219,230,255,0.2)",
                background: "rgba(219,230,255,0.06)",
                color: "#dbe6ff",
                outline: "none"
              }}
            />
          </label>
        </div>

        {error ? (
          <div style={{ marginTop: 12, padding: 10, borderRadius: 12, background: "rgba(255,80,80,0.12)" }}>
            {error}
          </div>
        ) : null}

        <button
          disabled={loading}
          type="submit"
          style={{
            marginTop: 14,
            width: "100%",
            padding: "11px 12px",
            borderRadius: 12,
            border: "1px solid rgba(219,230,255,0.25)",
            background: loading ? "rgba(219,230,255,0.16)" : "rgba(219,230,255,0.12)",
            color: "#dbe6ff",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 600
          }}
        >
          {loading ? "Aguarde..." : title}
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, opacity: 0.85 }}>
          <button
            type="button"
            onClick={() => void bootstrap()}
            disabled={loading}
            style={{
              background: "transparent",
              border: "none",
              color: "#dbe6ff",
              cursor: loading ? "not-allowed" : "pointer",
              textDecoration: "underline"
            }}
          >
            Bootstrap admin
          </button>
          <a href="http://localhost:4000/health" target="_blank" rel="noreferrer" style={{ color: "#dbe6ff" }}>
            Health
          </a>
        </div>
      </form>
    </div>
  );
}
