import { useEffect, useMemo, useState } from "react";
import { apiFetch, type ApiError } from "../../lib/api";

type Room = { id: string; name: string; location?: string | null };

type RoomDraft = { name: string; location: string };

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

export function RoomsPage() {
  const title = useMemo(() => "Salas", []);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [drafts, setDrafts] = useState<Record<string, RoomDraft>>({});
  const [createName, setCreateName] = useState("");
  const [createLocation, setCreateLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    const list = await apiFetch<Room[]>("/rooms");
    setRooms(list);
    setDrafts(Object.fromEntries(list.map((r) => [r.id, { name: r.name, location: r.location ?? "" }])));
  };

  useEffect(() => {
    void refresh().catch(() => null);
  }, []);

  const create = async () => {
    const name = createName.trim();
    const location = createLocation;
    if (!name) return;
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/rooms", {
        method: "POST",
        body: JSON.stringify({ name, location: location.trim() ? location : undefined })
      });
      setCreateName("");
      setCreateLocation("");
      await refresh();
    } catch (err) {
      setError((err as ApiError)?.message ?? "Falha ao criar sala");
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
      await apiFetch(`/rooms/${id}`, { method: "PATCH", body: JSON.stringify({ name, location: draft.location }) });
      await refresh();
    } catch (err) {
      setError((err as ApiError)?.message ?? "Falha ao atualizar sala");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 6 }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <div style={{ opacity: 0.85 }}>Cadastre e mantenha salas usadas nas sessões.</div>
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

      <Panel title="Nova sala">
        <div style={{ display: "grid", gap: 10, maxWidth: 520 }}>
          <label style={{ display: "grid", gap: 6, fontSize: 12, opacity: 0.9 }}>
            Nome
            <input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Ex.: Sala Azul"
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
            Localização (opcional)
            <input
              value={createLocation}
              onChange={(e) => setCreateLocation(e.target.value)}
              placeholder="Ex.: 2º andar"
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

      <Panel title="Salas cadastradas">
        <div style={{ display: "grid", gap: 10 }}>
          {rooms.length === 0 ? <div style={{ opacity: 0.85 }}>Nenhuma sala cadastrada</div> : null}
          {rooms.map((r) => {
            const draft = drafts[r.id] ?? { name: r.name ?? "", location: (r.location ?? "") as string };
            const isValid = !!draft.name.trim();
            return (
              <div
                key={r.id}
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
                        setDrafts((prev) => ({ ...prev, [r.id]: { ...(prev[r.id] ?? draft), name: e.target.value } }))
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
                    Localização
                    <input
                      value={draft.location}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [r.id]: { ...(prev[r.id] ?? draft), location: e.target.value } }))
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
                    onClick={() => void update(r.id)}
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

                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", opacity: 0.85, fontSize: 12 }}>
                  <span>ID: {r.id}</span>
                  <span>Nome atual: {r.name}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
