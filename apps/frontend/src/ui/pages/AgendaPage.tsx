import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, type ApiError } from "../../lib/api";

type Child = { id: string; name: string };
type Room = { id: string; name: string };
type Protocol = { id: string; name: string };
type User = { id: string; name: string; email: string; role: "ADMIN" | "COORDINATOR" | "THERAPIST" | "OPERATOR" };

type Appointment = {
  id: string;
  startAt: string;
  endAt: string;
  status: "SCHEDULED" | "CANCELLED";
  child: Child;
  room: Room;
  therapist: User;
  protocol?: Protocol | null;
  session?: { status: "NOT_STARTED" | "IN_PROGRESS" | "FINISHED" } | null;
};

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

function toIsoFromDatetimeLocal(value: string): string {
  const d = new Date(value);
  return d.toISOString();
}

function toDatetimeLocalFromIso(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export function AgendaPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [therapists, setTherapists] = useState<User[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [date, setDate] = useState(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });

  const [formChildId, setFormChildId] = useState<string>("");
  const [formRoomId, setFormRoomId] = useState<string>("");
  const [formTherapistId, setFormTherapistId] = useState<string>("");
  const [formProtocolId, setFormProtocolId] = useState<string>("");
  const [formStartAt, setFormStartAt] = useState<string>(() => toDatetimeLocalFromIso(new Date().toISOString()));
  const [formEndAt, setFormEndAt] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 50);
    return toDatetimeLocalFromIso(d.toISOString());
  });

  const [loading, setLoading] = useState(false);
  const [quickLoading, setQuickLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quickChildName, setQuickChildName] = useState("");
  const [quickRoomName, setQuickRoomName] = useState("");
  const [quickProtocolName, setQuickProtocolName] = useState("");

  const windowRange = useMemo(() => {
    const from = new Date(`${date}T00:00:00`);
    const to = new Date(`${date}T23:59:59`);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [date]);

  const refreshAll = async () => {
    const [c, r, p, u] = await Promise.all([
      apiFetch<Child[]>("/children"),
      apiFetch<Room[]>("/rooms"),
      apiFetch<Protocol[]>("/protocols"),
      apiFetch<User[]>("/users/therapists").catch(() => [])
    ]);
    setChildren(c);
    setRooms(r);
    setProtocols(p);
    setTherapists(u);

    if (!formChildId && c[0]) setFormChildId(c[0].id);
    if (!formRoomId && r[0]) setFormRoomId(r[0].id);
    if (!formTherapistId && u[0]) setFormTherapistId(u[0].id);
  };

  const refreshAppointments = async () => {
    const res = await apiFetch<Appointment[]>(`/appointments?from=${encodeURIComponent(windowRange.from)}&to=${encodeURIComponent(windowRange.to)}`);
    setAppointments(res);
  };

  useEffect(() => {
    void refreshAll().catch(() => null);
  }, []);

  useEffect(() => {
    void refreshAppointments().catch(() => null);
  }, [windowRange.from, windowRange.to]);

  const createAppointment = async () => {
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/appointments", {
        method: "POST",
        body: JSON.stringify({
          childId: formChildId,
          roomId: formRoomId,
          therapistId: formTherapistId,
          protocolId: formProtocolId || undefined,
          startAt: toIsoFromDatetimeLocal(formStartAt),
          endAt: toIsoFromDatetimeLocal(formEndAt)
        })
      });
      await refreshAppointments();
    } catch (err) {
      setError((err as ApiError)?.message ?? "Falha ao criar agendamento");
    } finally {
      setLoading(false);
    }
  };

  const cancelAppointment = async (id: string) => {
    setError(null);
    setLoading(true);
    try {
      await apiFetch(`/appointments/${id}/cancel`, { method: "POST", body: JSON.stringify({}) });
      await refreshAppointments();
    } catch (err) {
      setError((err as ApiError)?.message ?? "Falha ao cancelar");
    } finally {
      setLoading(false);
    }
  };

  const createChildQuick = async () => {
    const name = quickChildName.trim();
    if (!name) return;
    setError(null);
    setQuickLoading(true);
    try {
      const created = await apiFetch<Child>("/children", { method: "POST", body: JSON.stringify({ name }) });
      await refreshAll();
      setFormChildId(created.id);
      setQuickChildName("");
    } catch (err) {
      setError((err as ApiError)?.message ?? "Falha ao criar criança");
    } finally {
      setQuickLoading(false);
    }
  };

  const createRoomQuick = async () => {
    const name = quickRoomName.trim();
    if (!name) return;
    setError(null);
    setQuickLoading(true);
    try {
      const created = await apiFetch<Room>("/rooms", { method: "POST", body: JSON.stringify({ name }) });
      await refreshAll();
      setFormRoomId(created.id);
      setQuickRoomName("");
    } catch (err) {
      setError((err as ApiError)?.message ?? "Falha ao criar sala");
    } finally {
      setQuickLoading(false);
    }
  };

  const createProtocolQuick = async () => {
    const name = quickProtocolName.trim();
    if (!name) return;
    setError(null);
    setQuickLoading(true);
    try {
      const created = await apiFetch<Protocol>("/protocols", { method: "POST", body: JSON.stringify({ name }) });
      await refreshAll();
      setFormProtocolId(created.id);
      setQuickProtocolName("");
    } catch (err) {
      setError((err as ApiError)?.message ?? "Falha ao criar protocolo");
    } finally {
      setQuickLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>Agenda</h2>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(219,230,255,0.2)",
              background: "rgba(219,230,255,0.06)",
              color: "#dbe6ff"
            }}
          />
          <button
            onClick={() => void refreshAppointments()}
            disabled={loading || quickLoading}
            style={{
              border: "1px solid rgba(219,230,255,0.2)",
              background: "rgba(219,230,255,0.08)",
              color: "#dbe6ff",
              padding: "10px 12px",
              borderRadius: 10,
              cursor: loading || quickLoading ? "not-allowed" : "pointer"
            }}
          >
            Atualizar
          </button>
        </div>
      </div>

      {error ? (
        <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,80,80,0.25)", background: "rgba(255,80,80,0.10)" }}>
          {error}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 12, alignItems: "start" }}>
        <Panel title="Novo agendamento">
          <div style={{ display: "grid", gap: 10 }}>
            <label style={{ display: "grid", gap: 6, fontSize: 12, opacity: 0.9 }}>
              Criança
              <select
                value={formChildId}
                onChange={(e) => setFormChildId(e.target.value)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(219,230,255,0.2)",
                  background: "rgba(219,230,255,0.06)",
                  color: "#dbe6ff"
                }}
              >
                {children.length === 0 ? <option value="">—</option> : null}
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6, fontSize: 12, opacity: 0.9 }}>
              Sala
              <select
                value={formRoomId}
                onChange={(e) => setFormRoomId(e.target.value)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(219,230,255,0.2)",
                  background: "rgba(219,230,255,0.06)",
                  color: "#dbe6ff"
                }}
              >
                {rooms.length === 0 ? <option value="">—</option> : null}
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6, fontSize: 12, opacity: 0.9 }}>
              Terapeuta
              <select
                value={formTherapistId}
                onChange={(e) => setFormTherapistId(e.target.value)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(219,230,255,0.2)",
                  background: "rgba(219,230,255,0.06)",
                  color: "#dbe6ff"
                }}
              >
                {therapists.length === 0 ? <option value="">—</option> : null}
                {therapists.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6, fontSize: 12, opacity: 0.9 }}>
              Protocolo (opcional)
              <select
                value={formProtocolId}
                onChange={(e) => setFormProtocolId(e.target.value)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(219,230,255,0.2)",
                  background: "rgba(219,230,255,0.06)",
                  color: "#dbe6ff"
                }}
              >
                <option value="">—</option>
                {protocols.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6, fontSize: 12, opacity: 0.9 }}>
              Início
              <input
                type="datetime-local"
                value={formStartAt}
                onChange={(e) => setFormStartAt(e.target.value)}
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
              Fim
              <input
                type="datetime-local"
                value={formEndAt}
                onChange={(e) => setFormEndAt(e.target.value)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(219,230,255,0.2)",
                  background: "rgba(219,230,255,0.06)",
                  color: "#dbe6ff"
                }}
              />
            </label>

            <div
              style={{
                marginTop: 6,
                padding: 12,
                borderRadius: 14,
                border: "1px solid rgba(219,230,255,0.14)",
                background: "rgba(0,0,0,0.12)",
                display: "grid",
                gap: 10
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 13, opacity: 0.95 }}>Cadastro rápido</div>

              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 12, opacity: 0.9 }}>Nova criança</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={quickChildName}
                      onChange={(e) => setQuickChildName(e.target.value)}
                      placeholder="Ex.: Criança 1"
                      style={{
                        flex: 1,
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(219,230,255,0.2)",
                        background: "rgba(219,230,255,0.06)",
                        color: "#dbe6ff"
                      }}
                    />
                    <button
                      disabled={loading || quickLoading || !quickChildName.trim()}
                      onClick={() => void createChildQuick()}
                      style={{
                        border: "1px solid rgba(219,230,255,0.2)",
                        background: "rgba(219,230,255,0.08)",
                        color: "#dbe6ff",
                        padding: "10px 12px",
                        borderRadius: 12,
                        cursor: loading || quickLoading || !quickChildName.trim() ? "not-allowed" : "pointer",
                        fontWeight: 600,
                        whiteSpace: "nowrap"
                      }}
                    >
                      Criar
                    </button>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 12, opacity: 0.9 }}>Nova sala</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={quickRoomName}
                      onChange={(e) => setQuickRoomName(e.target.value)}
                      placeholder="Ex.: Sala Azul"
                      style={{
                        flex: 1,
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(219,230,255,0.2)",
                        background: "rgba(219,230,255,0.06)",
                        color: "#dbe6ff"
                      }}
                    />
                    <button
                      disabled={loading || quickLoading || !quickRoomName.trim()}
                      onClick={() => void createRoomQuick()}
                      style={{
                        border: "1px solid rgba(219,230,255,0.2)",
                        background: "rgba(219,230,255,0.08)",
                        color: "#dbe6ff",
                        padding: "10px 12px",
                        borderRadius: 12,
                        cursor: loading || quickLoading || !quickRoomName.trim() ? "not-allowed" : "pointer",
                        fontWeight: 600,
                        whiteSpace: "nowrap"
                      }}
                    >
                      Criar
                    </button>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 12, opacity: 0.9 }}>Novo protocolo (opcional)</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={quickProtocolName}
                      onChange={(e) => setQuickProtocolName(e.target.value)}
                      placeholder="Ex.: ABA - Comunicação"
                      style={{
                        flex: 1,
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(219,230,255,0.2)",
                        background: "rgba(219,230,255,0.06)",
                        color: "#dbe6ff"
                      }}
                    />
                    <button
                      disabled={loading || quickLoading || !quickProtocolName.trim()}
                      onClick={() => void createProtocolQuick()}
                      style={{
                        border: "1px solid rgba(219,230,255,0.2)",
                        background: "rgba(219,230,255,0.08)",
                        color: "#dbe6ff",
                        padding: "10px 12px",
                        borderRadius: 12,
                        cursor: loading || quickLoading || !quickProtocolName.trim() ? "not-allowed" : "pointer",
                        fontWeight: 600,
                        whiteSpace: "nowrap"
                      }}
                    >
                      Criar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              disabled={loading || quickLoading || !formChildId || !formRoomId || !formTherapistId}
              onClick={() => void createAppointment()}
              style={{
                border: "1px solid rgba(219,230,255,0.2)",
                background: "rgba(219,230,255,0.12)",
                color: "#dbe6ff",
                padding: "10px 12px",
                borderRadius: 12,
                cursor: loading || quickLoading || !formChildId || !formRoomId || !formTherapistId ? "not-allowed" : "pointer",
                fontWeight: 600
              }}
            >
              Criar agendamento
            </button>
          </div>
        </Panel>

        <Panel title="Agendamentos do dia">
          <div style={{ display: "grid", gap: 10 }}>
            {appointments.length === 0 ? <div style={{ opacity: 0.85 }}>Sem agendamentos</div> : null}
            {appointments.map((a) => (
              <div
                key={a.id}
                style={{
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(219,230,255,0.12)",
                  background: "rgba(0,0,0,0.14)",
                  display: "grid",
                  gap: 8
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <strong>
                    {new Date(a.startAt).toLocaleTimeString()}–{new Date(a.endAt).toLocaleTimeString()} • {a.child.name}
                  </strong>
                  <span style={{ opacity: 0.85 }}>{a.status}</span>
                </div>
                <div style={{ opacity: 0.9, fontSize: 13 }}>
                  {a.room.name} • {a.therapist.name} {a.protocol?.name ? `• ${a.protocol.name}` : ""}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Link
                    to={`/session/${a.id}`}
                    style={{
                      color: "#dbe6ff",
                      textDecoration: "none",
                      border: "1px solid rgba(219,230,255,0.2)",
                      background: "rgba(219,230,255,0.08)",
                      padding: "8px 10px",
                      borderRadius: 12
                    }}
                  >
                    Abrir sessão
                  </Link>
                  <button
                    disabled={loading || quickLoading || a.status !== "SCHEDULED"}
                    onClick={() => void cancelAppointment(a.id)}
                    style={{
                      border: "1px solid rgba(219,230,255,0.2)",
                      background: "rgba(219,230,255,0.06)",
                      color: "#dbe6ff",
                      padding: "8px 10px",
                      borderRadius: 12,
                      cursor: loading || quickLoading || a.status !== "SCHEDULED" ? "not-allowed" : "pointer"
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
