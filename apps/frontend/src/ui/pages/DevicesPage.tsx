import { useEffect, useMemo, useState } from "react";
import { apiFetch, type ApiError } from "../../lib/api";

type Room = { id: string; name: string };

type Device = {
  id: string;
  name: string;
  kind: string;
  serial?: string | null;
  roomId?: string | null;
  createdAt: string;
};

type DeviceDraft = { name: string; kind: string; serial: string; roomId: string };

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

export function DevicesPage() {
  const title = useMemo(() => "Dispositivos", []);
  const [devices, setDevices] = useState<Device[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DeviceDraft>>({});
  const [createName, setCreateName] = useState("");
  const [createKind, setCreateKind] = useState("");
  const [createSerial, setCreateSerial] = useState("");
  const [createRoomId, setCreateRoomId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    const [list, roomsList] = await Promise.all([apiFetch<Device[]>("/devices"), apiFetch<Room[]>("/rooms")]);
    setDevices(list);
    setRooms(roomsList);
    setDrafts(
      Object.fromEntries(
        list.map((d) => [
          d.id,
          { name: d.name, kind: d.kind, serial: d.serial ?? "", roomId: d.roomId ?? "" }
        ])
      )
    );
  };

  useEffect(() => {
    void refresh().catch(() => null);
  }, []);

  const create = async () => {
    const name = createName.trim();
    const kind = createKind.trim();
    if (!name || !kind) return;
    const serial = createSerial.trim() ? createSerial : undefined;
    const roomId = createRoomId || undefined;
    setError(null);
    setLoading(true);
    try {
      await apiFetch<Device>("/devices", { method: "POST", body: JSON.stringify({ name, kind, serial, roomId }) });
      setCreateName("");
      setCreateKind("");
      setCreateSerial("");
      setCreateRoomId("");
      await refresh();
    } catch (err) {
      setError((err as ApiError)?.message ?? "Falha ao criar dispositivo");
    } finally {
      setLoading(false);
    }
  };

  const update = async (id: string) => {
    const draft = drafts[id];
    if (!draft) return;
    const name = draft.name.trim();
    const kind = draft.kind.trim();
    if (!name || !kind) return;
    const serial = draft.serial.trim() ? draft.serial : undefined;
    const roomId = draft.roomId || undefined;
    setError(null);
    setLoading(true);
    try {
      await apiFetch(`/devices/${id}`, { method: "PATCH", body: JSON.stringify({ name, kind, serial, roomId }) });
      await refresh();
    } catch (err) {
      setError((err as ApiError)?.message ?? "Falha ao atualizar dispositivo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 6 }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <div style={{ opacity: 0.85 }}>Cadastre e mantenha dispositivos associados às salas.</div>
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

      <Panel title="Novo dispositivo">
        <div style={{ display: "grid", gap: 10, maxWidth: 820 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ display: "grid", gap: 6, fontSize: 12, opacity: 0.9 }}>
              Nome
              <input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Ex.: Quest 3"
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
              Tipo
              <input
                value={createKind}
                onChange={(e) => setCreateKind(e.target.value)}
                placeholder="Ex.: VR"
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
              Serial (opcional)
              <input
                value={createSerial}
                onChange={(e) => setCreateSerial(e.target.value)}
                placeholder="Ex.: ABC-123"
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
              Sala (opcional)
              <select
                value={createRoomId}
                onChange={(e) => setCreateRoomId(e.target.value)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(219,230,255,0.2)",
                  background: "rgba(219,230,255,0.06)",
                  color: "#dbe6ff"
                }}
              >
                <option value="">—</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            disabled={loading || !createName.trim() || !createKind.trim()}
            onClick={() => void create()}
            style={{
              justifySelf: "start",
              border: "1px solid rgba(219,230,255,0.2)",
              background: "rgba(219,230,255,0.12)",
              color: "#dbe6ff",
              padding: "10px 12px",
              borderRadius: 12,
              cursor: loading || !createName.trim() || !createKind.trim() ? "not-allowed" : "pointer",
              fontWeight: 600
            }}
          >
            Criar
          </button>
        </div>
      </Panel>

      <Panel title="Dispositivos cadastrados">
        <div style={{ display: "grid", gap: 10 }}>
          {devices.length === 0 ? <div style={{ opacity: 0.85 }}>Nenhum dispositivo cadastrado</div> : null}
          {devices.map((d) => {
            const draft = drafts[d.id] ?? { name: d.name, kind: d.kind, serial: d.serial ?? "", roomId: d.roomId ?? "" };
            const isValid = !!draft.name.trim() && !!draft.kind.trim();
            return (
              <div
                key={d.id}
                style={{
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(219,230,255,0.12)",
                  background: "rgba(0,0,0,0.14)",
                  display: "grid",
                  gap: 10
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <label style={{ display: "grid", gap: 6, fontSize: 12, opacity: 0.9 }}>
                    Nome
                    <input
                      value={draft.name}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [d.id]: { ...(prev[d.id] ?? draft), name: e.target.value } }))
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
                    Tipo
                    <input
                      value={draft.kind}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [d.id]: { ...(prev[d.id] ?? draft), kind: e.target.value } }))
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
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, alignItems: "end" }}>
                  <label style={{ display: "grid", gap: 6, fontSize: 12, opacity: 0.9 }}>
                    Serial
                    <input
                      value={draft.serial}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [d.id]: { ...(prev[d.id] ?? draft), serial: e.target.value } }))
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
                    Sala
                    <select
                      value={draft.roomId}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [d.id]: { ...(prev[d.id] ?? draft), roomId: e.target.value } }))
                      }
                      style={{
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(219,230,255,0.2)",
                        background: "rgba(219,230,255,0.06)",
                        color: "#dbe6ff"
                      }}
                    >
                      <option value="">—</option>
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button
                    disabled={loading || !isValid}
                    onClick={() => void update(d.id)}
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

                <div style={{ opacity: 0.85, fontSize: 12, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <span>ID: {d.id}</span>
                  <span>Criado em: {new Date(d.createdAt).toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
