import { useEffect, useMemo, useState } from "react";
import { apiFetch, type ApiError } from "../../lib/api";

type Role = "ADMIN" | "COORDINATOR" | "THERAPIST" | "OPERATOR";

type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
};

type UserDraft = { name: string; role: Role };

function Panel(props: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        border: "1px solid rgba(219,230,255,0.16)",
        background: "rgba(219,230,255,0.06)"
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 10 }}>{props.title}</div>
      {props.children}
    </div>
  );
}

export function UsersPage() {
  const title = useMemo(() => "Usuários", []);
  const [users, setUsers] = useState<User[]>([]);
  const [drafts, setDrafts] = useState<Record<string, UserDraft>>({});
  const [createEmail, setCreateEmail] = useState("");
  const [createName, setCreateName] = useState("");
  const [createRole, setCreateRole] = useState<Role>("THERAPIST");
  const [createPassword, setCreatePassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    const list = await apiFetch<User[]>("/users");
    setUsers(list);
    setDrafts(Object.fromEntries(list.map((u) => [u.id, { name: u.name, role: u.role }])));
  };

  useEffect(() => {
    void refresh().catch(() => null);
  }, []);

  const create = async () => {
    const email = createEmail.trim();
    const name = createName.trim();
    const password = createPassword;
    if (!email || !name || password.length < 8) return;
    setError(null);
    setLoading(true);
    try {
      await apiFetch<{ id: string }>("/users", {
        method: "POST",
        body: JSON.stringify({ email, name, role: createRole, password })
      });
      setCreateEmail("");
      setCreateName("");
      setCreateRole("THERAPIST");
      setCreatePassword("");
      await refresh();
    } catch (err) {
      setError((err as ApiError)?.message ?? "Falha ao criar usuário");
    } finally {
      setLoading(false);
    }
  };

  const update = async (id: string) => {
    const draft = drafts[id];
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) return;
    setError(null);
    setLoading(true);
    try {
      await apiFetch(`/users/${id}`, { method: "PATCH", body: JSON.stringify({ name, role: draft.role }) });
      await refresh();
    } catch (err) {
      setError((err as ApiError)?.message ?? "Falha ao atualizar usuário");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 6 }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <div style={{ opacity: 0.85 }}>Gerencie usuários e papéis do sistema.</div>
      </div>

      {error ? (
        <div
          style={{
            padding: 12,
            borderRadius: 14,
            border: "1px solid rgba(255,160,160,0.25)",
            background: "rgba(255,160,160,0.10)"
          }}
        >
          {error}
        </div>
      ) : null}

      <Panel title="Novo usuário">
        <div style={{ display: "grid", gap: 10, maxWidth: 620 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ display: "grid", gap: 6, fontSize: 12, opacity: 0.9 }}>
              Email
              <input
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                placeholder="usuario@dominio.com"
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(219,230,255,0.2)",
                  background: "rgba(219,230,255,0.06)",
                  color: "#dbe6ff"
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 6, fontSize: 12, opacity: 0.9 }}>
              Nome
              <input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Nome"
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(219,230,255,0.2)",
                  background: "rgba(219,230,255,0.06)",
                  color: "#dbe6ff"
                }}
              />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ display: "grid", gap: 6, fontSize: 12, opacity: 0.9 }}>
              Papel
              <select
                value={createRole}
                onChange={(e) => setCreateRole(e.target.value as Role)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(219,230,255,0.2)",
                  background: "rgba(219,230,255,0.06)",
                  color: "#dbe6ff"
                }}
              >
                <option value="ADMIN">ADMIN</option>
                <option value="COORDINATOR">COORDINATOR</option>
                <option value="THERAPIST">THERAPIST</option>
                <option value="OPERATOR">OPERATOR</option>
              </select>
            </label>

            <label style={{ display: "grid", gap: 6, fontSize: 12, opacity: 0.9 }}>
              Senha (mín. 8)
              <input
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                type="password"
                placeholder="********"
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(219,230,255,0.2)",
                  background: "rgba(219,230,255,0.06)",
                  color: "#dbe6ff"
                }}
              />
            </label>
          </div>

          <button
            disabled={loading || !createEmail.trim() || !createName.trim() || createPassword.length < 8}
            onClick={() => void create()}
            style={{
              justifySelf: "start",
              border: "1px solid rgba(219,230,255,0.2)",
              background: "rgba(219,230,255,0.12)",
              color: "#dbe6ff",
              padding: "10px 12px",
              borderRadius: 12,
              cursor:
                loading || !createEmail.trim() || !createName.trim() || createPassword.length < 8 ? "not-allowed" : "pointer",
              fontWeight: 600
            }}
          >
            Criar
          </button>
        </div>
      </Panel>

      <Panel title="Usuários cadastrados">
        <div style={{ display: "grid", gap: 10 }}>
          {users.length === 0 ? <div style={{ opacity: 0.85 }}>Nenhum usuário cadastrado</div> : null}
          {users.map((u) => {
            const draft = drafts[u.id] ?? { name: u.name, role: u.role };
            const isValid = !!draft.name.trim();
            return (
              <div
                key={u.id}
                style={{
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(219,230,255,0.12)",
                  background: "rgba(0,0,0,0.14)",
                  display: "grid",
                  gap: 10
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 220px auto", gap: 10, alignItems: "end" }}>
                  <label style={{ display: "grid", gap: 6, fontSize: 12, opacity: 0.9 }}>
                    Nome
                    <input
                      value={draft.name}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [u.id]: { ...(prev[u.id] ?? draft), name: e.target.value } }))
                      }
                      style={{
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(219,230,255,0.2)",
                        background: "rgba(219,230,255,0.06)",
                        color: "#dbe6ff"
                      }}
                    />
                  </label>

                  <label style={{ display: "grid", gap: 6, fontSize: 12, opacity: 0.9 }}>
                    Papel
                    <select
                      value={draft.role}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [u.id]: { ...(prev[u.id] ?? draft), role: e.target.value as Role } }))
                      }
                      style={{
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(219,230,255,0.2)",
                        background: "rgba(219,230,255,0.06)",
                        color: "#dbe6ff"
                      }}
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="COORDINATOR">COORDINATOR</option>
                      <option value="THERAPIST">THERAPIST</option>
                      <option value="OPERATOR">OPERATOR</option>
                    </select>
                  </label>

                  <button
                    disabled={loading || !isValid}
                    onClick={() => void update(u.id)}
                    style={{
                      border: "1px solid rgba(219,230,255,0.2)",
                      background: "rgba(219,230,255,0.08)",
                      color: "#dbe6ff",
                      padding: "10px 12px",
                      borderRadius: 12,
                      cursor: loading || !isValid ? "not-allowed" : "pointer",
                      fontWeight: 600,
                      whiteSpace: "nowrap"
                    }}
                  >
                    Salvar
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                    opacity: 0.85,
                    fontSize: 12
                  }}
                >
                  <span>Email: {u.email}</span>
                  <span>Criado em: {new Date(u.createdAt).toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
