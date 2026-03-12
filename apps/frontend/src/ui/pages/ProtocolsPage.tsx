import { useEffect, useMemo, useState } from "react";
import { apiFetch, type ApiError } from "../../lib/api";

type Protocol = { id: string; name: string; description?: string | null; createdAt: string };

type ProtocolDraft = { name: string; description: string };

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

export function ProtocolsPage() {
  const title = useMemo(() => "Protocolos", []);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ProtocolDraft>>({});
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    const list = await apiFetch<Protocol[]>("/protocols");
    setProtocols(list);
    setDrafts(Object.fromEntries(list.map((p) => [p.id, { name: p.name, description: p.description ?? "" }])));
  };

  useEffect(() => {
    void refresh().catch(() => null);
  }, []);

  const create = async () => {
    const name = createName.trim();
    if (!name) return;
    const description = createDescription.trim() ? createDescription : undefined;
    setError(null);
    setLoading(true);
    try {
      await apiFetch<Protocol>("/protocols", { method: "POST", body: JSON.stringify({ name, description }) });
      setCreateName("");
      setCreateDescription("");
      await refresh();
    } catch (err) {
      setError((err as ApiError)?.message ?? "Falha ao criar protocolo");
    } finally {
      setLoading(false);
    }
  };

  const update = async (id: string) => {
    const draft = drafts[id];
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) return;
    const description = draft.description.trim() ? draft.description : undefined;
    setError(null);
    setLoading(true);
    try {
      await apiFetch(`/protocols/${id}`, { method: "PATCH", body: JSON.stringify({ name, description }) });
      await refresh();
    } catch (err) {
      setError((err as ApiError)?.message ?? "Falha ao atualizar protocolo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 6 }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <div style={{ opacity: 0.85 }}>Cadastre e mantenha protocolos usados nos agendamentos.</div>
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

      <Panel title="Novo protocolo">
        <div style={{ display: "grid", gap: 10, maxWidth: 820 }}>
          <label style={{ display: "grid", gap: 6, fontSize: 12, opacity: 0.9 }}>
            Nome
            <input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Ex.: ABA - Comunicação"
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
            Descrição (opcional)
            <textarea
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
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

      <Panel title="Protocolos cadastrados">
        <div style={{ display: "grid", gap: 10 }}>
          {protocols.length === 0 ? <div style={{ opacity: 0.85 }}>Nenhum protocolo cadastrado</div> : null}
          {protocols.map((p) => {
            const draft = drafts[p.id] ?? { name: p.name, description: p.description ?? "" };
            const isValid = !!draft.name.trim();
            return (
              <div
                key={p.id}
                style={{
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(219,230,255,0.12)",
                  background: "rgba(0,0,0,0.14)",
                  display: "grid",
                  gap: 10
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "end" }}>
                  <label style={{ display: "grid", gap: 6, fontSize: 12, opacity: 0.9 }}>
                    Nome
                    <input
                      value={draft.name}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [p.id]: { ...(prev[p.id] ?? draft), name: e.target.value } }))
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
                    onClick={() => void update(p.id)}
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
                  Descrição
                  <textarea
                    value={draft.description}
                    onChange={(e) =>
                      setDrafts((prev) => ({ ...prev, [p.id]: { ...(prev[p.id] ?? draft), description: e.target.value } }))
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
                  <span>ID: {p.id}</span>
                  <span>Criado em: {new Date(p.createdAt).toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
