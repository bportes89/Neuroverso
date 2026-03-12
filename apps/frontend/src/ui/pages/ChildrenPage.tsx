import { useEffect, useMemo, useState } from "react";
import { apiFetch, type ApiError } from "../../lib/api";

type Child = { id: string; name: string; birthDate?: string | null; notes?: string | null; createdAt: string };

type ChildDraft = { name: string; birthDateLocal: string; notes: string };

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

function toIsoFromDatetimeLocal(value: string): string | undefined {
  const v = value.trim();
  if (!v) return undefined;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function toDatetimeLocal(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export function ChildrenPage() {
  const title = useMemo(() => "Crianças", []);
  const [children, setChildren] = useState<Child[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ChildDraft>>({});
  const [createName, setCreateName] = useState("");
  const [createBirthDateLocal, setCreateBirthDateLocal] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    const list = await apiFetch<Child[]>("/children");
    setChildren(list);
    setDrafts(
      Object.fromEntries(
        list.map((c) => [
          c.id,
          {
            name: c.name,
            birthDateLocal: toDatetimeLocal(c.birthDate),
            notes: c.notes ?? ""
          }
        ])
      )
    );
  };

  useEffect(() => {
    void refresh().catch(() => null);
  }, []);

  const create = async () => {
    const name = createName.trim();
    if (!name) return;
    const birthDate = toIsoFromDatetimeLocal(createBirthDateLocal);
    const notes = createNotes.trim() ? createNotes : undefined;
    setError(null);
    setLoading(true);
    try {
      await apiFetch<Child>("/children", { method: "POST", body: JSON.stringify({ name, birthDate, notes }) });
      setCreateName("");
      setCreateBirthDateLocal("");
      setCreateNotes("");
      await refresh();
    } catch (err) {
      setError((err as ApiError)?.message ?? "Falha ao criar criança");
    } finally {
      setLoading(false);
    }
  };

  const update = async (id: string) => {
    const draft = drafts[id];
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) return;
    const birthDate = toIsoFromDatetimeLocal(draft.birthDateLocal);
    const notes = draft.notes.trim() ? draft.notes : undefined;
    setError(null);
    setLoading(true);
    try {
      await apiFetch(`/children/${id}`, { method: "PATCH", body: JSON.stringify({ name, birthDate, notes }) });
      await refresh();
    } catch (err) {
      setError((err as ApiError)?.message ?? "Falha ao atualizar criança");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 6 }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <div style={{ opacity: 0.85 }}>Cadastre e mantenha os perfis usados nos agendamentos.</div>
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

      <Panel title="Nova criança">
        <div style={{ display: "grid", gap: 10, maxWidth: 720 }}>
          <label style={{ display: "grid", gap: 6, fontSize: 12, opacity: 0.9 }}>
            Nome
            <input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Ex.: Criança 1"
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(219,230,255,0.2)",
                background: "rgba(219,230,255,0.06)",
                color: "#dbe6ff"
              }}
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ display: "grid", gap: 6, fontSize: 12, opacity: 0.9 }}>
              Data de nascimento (opcional)
              <input
                type="datetime-local"
                value={createBirthDateLocal}
                onChange={(e) => setCreateBirthDateLocal(e.target.value)}
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

          <label style={{ display: "grid", gap: 6, fontSize: 12, opacity: 0.9 }}>
            Observações (opcional)
            <textarea
              value={createNotes}
              onChange={(e) => setCreateNotes(e.target.value)}
              rows={4}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(219,230,255,0.2)",
                background: "rgba(219,230,255,0.06)",
                color: "#dbe6ff",
                resize: "vertical"
              }}
            />
          </label>

          <button
            disabled={loading || !createName.trim()}
            onClick={() => void create()}
            style={{
              justifySelf: "start",
              border: "1px solid rgba(219,230,255,0.2)",
              background: "rgba(219,230,255,0.12)",
              color: "#dbe6ff",
              padding: "10px 12px",
              borderRadius: 12,
              cursor: loading || !createName.trim() ? "not-allowed" : "pointer",
              fontWeight: 600
            }}
          >
            Criar
          </button>
        </div>
      </Panel>

      <Panel title="Crianças cadastradas">
        <div style={{ display: "grid", gap: 10 }}>
          {children.length === 0 ? <div style={{ opacity: 0.85 }}>Nenhuma criança cadastrada</div> : null}
          {children.map((c) => {
            const draft = drafts[c.id] ?? { name: c.name, birthDateLocal: toDatetimeLocal(c.birthDate), notes: c.notes ?? "" };
            const isValid = !!draft.name.trim();
            return (
              <div
                key={c.id}
                style={{
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(219,230,255,0.12)",
                  background: "rgba(0,0,0,0.14)",
                  display: "grid",
                  gap: 10
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, alignItems: "end" }}>
                  <label style={{ display: "grid", gap: 6, fontSize: 12, opacity: 0.9 }}>
                    Nome
                    <input
                      value={draft.name}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [c.id]: { ...(prev[c.id] ?? draft), name: e.target.value } }))
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
                    Data de nascimento
                    <input
                      type="datetime-local"
                      value={draft.birthDateLocal}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [c.id]: { ...(prev[c.id] ?? draft), birthDateLocal: e.target.value }
                        }))
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

                  <button
                    disabled={loading || !isValid}
                    onClick={() => void update(c.id)}
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

                <label style={{ display: "grid", gap: 6, fontSize: 12, opacity: 0.9 }}>
                  Observações
                  <textarea
                    value={draft.notes}
                    onChange={(e) =>
                      setDrafts((prev) => ({ ...prev, [c.id]: { ...(prev[c.id] ?? draft), notes: e.target.value } }))
                    }
                    rows={3}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(219,230,255,0.2)",
                      background: "rgba(219,230,255,0.06)",
                      color: "#dbe6ff",
                      resize: "vertical"
                    }}
                  />
                </label>

                <div style={{ opacity: 0.85, fontSize: 12, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <span>ID: {c.id}</span>
                  <span>Criado em: {new Date(c.createdAt).toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
