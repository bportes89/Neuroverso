import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch, getApiBaseUrl, type ApiError } from "../../lib/api";
import { getToken } from "../../lib/auth";

type Session = {
  appointmentId: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "FINISHED";
  startedAt?: string | null;
  endedAt?: string | null;
  appointment: {
    id: string;
    startAt: string;
    endAt: string;
    status: "SCHEDULED" | "CANCELLED";
    child: { id: string; name: string };
    room: { id: string; name: string };
    therapist: { id: string; name: string; email: string };
    protocol?: { id: string; name: string } | null;
  };
  notes: Array<{ id: string; text: string; createdAt: string; author: { id: string; name: string; email: string } }>;
};

type Short = { id: string; durationMs: number; mimeType: string; sha256: string; createdAt: string };

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

export function SessionPage() {
  const params = useParams();
  const appointmentId = params.appointmentId ?? "";

  const [session, setSession] = useState<Session | null>(null);
  const [noteText, setNoteText] = useState("");
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [reportSha256, setReportSha256] = useState<string | null>(null);
  const [shorts, setShorts] = useState<Short[]>([]);
  const [shortObjectUrls, setShortObjectUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const objectUrlsRef = useRef<string[]>([]);

  const title = useMemo(() => (session ? `Sessão • ${session.appointment.child.name}` : "Sessão"), [session]);

  const refresh = async () => {
    const [res, s] = await Promise.all([
      apiFetch<Session>(`/sessions/${appointmentId}`),
      apiFetch<Short[]>(`/appointments/${appointmentId}/shorts`).catch(() => [])
    ]);
    setSession(res);
    setShorts(s);
  };

  useEffect(() => {
    if (!appointmentId) return;
    void refresh().catch(() => null);
  }, [appointmentId]);

  const start = async () => {
    setError(null);
    setLoading(true);
    try {
      await apiFetch(`/sessions/${appointmentId}/start`, { method: "POST", body: JSON.stringify({}) });
      await refresh();
    } catch (err) {
      setError((err as ApiError)?.message ?? "Falha ao iniciar sessão");
    } finally {
      setLoading(false);
    }
  };

  const end = async () => {
    setError(null);
    setLoading(true);
    try {
      await apiFetch(`/sessions/${appointmentId}/end`, { method: "POST", body: JSON.stringify({}) });
      await refresh();
    } catch (err) {
      setError((err as ApiError)?.message ?? "Falha ao encerrar sessão");
    } finally {
      setLoading(false);
    }
  };

  const addNote = async () => {
    if (!noteText.trim()) return;
    setError(null);
    setLoading(true);
    try {
      await apiFetch(`/sessions/${appointmentId}/notes`, { method: "POST", body: JSON.stringify({ text: noteText }) });
      setNoteText("");
      await refresh();
    } catch (err) {
      setError((err as ApiError)?.message ?? "Falha ao registrar observação");
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ reportId: string; sha256: string; createdAt: string }>(`/reports/appointments/${appointmentId}/pdf`, {
        method: "POST",
        body: JSON.stringify({})
      });
      const apiBase = getApiBaseUrl();
      const url = `${apiBase}/reports/${res.reportId}/download`;
      const token = getToken();
      const blob = await fetch(url, { headers: token ? { authorization: `Bearer ${token}` } : {} }).then(async (r) => {
        if (!r.ok) {
          const ct = r.headers.get("content-type") ?? "";
          const data = ct.includes("application/json") ? await r.json().catch(() => null) : await r.text();
          const msg = typeof (data as any)?.message === "string" ? (data as any).message : `Erro HTTP ${r.status}`;
          throw { status: r.status, message: msg, data } as ApiError;
        }
        return r.blob();
      });
      const objectUrl = URL.createObjectURL(blob);
      objectUrlsRef.current.push(objectUrl);
      setReportUrl(objectUrl);
      setReportSha256(res.sha256);
      window.open(objectUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError((err as ApiError)?.message ?? "Falha ao gerar relatório");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      for (const u of objectUrlsRef.current) URL.revokeObjectURL(u);
      objectUrlsRef.current = [];
    };
  }, []);

  const loadShortObjectUrl = async (shortId: string) => {
    if (shortObjectUrls[shortId]) return;
    setError(null);
    try {
      const apiBase = getApiBaseUrl();
      const url = `${apiBase}/shorts/${shortId}/download`;
      const token = getToken();
      const blob = await fetch(url, { headers: token ? { authorization: `Bearer ${token}` } : {} }).then(async (r) => {
        if (!r.ok) {
          const ct = r.headers.get("content-type") ?? "";
          const data = ct.includes("application/json") ? await r.json().catch(() => null) : await r.text();
          const msg = typeof (data as any)?.message === "string" ? (data as any).message : `Erro HTTP ${r.status}`;
          throw { status: r.status, message: msg, data } as ApiError;
        }
        return r.blob();
      });
      const objectUrl = URL.createObjectURL(blob);
      objectUrlsRef.current.push(objectUrl);
      setShortObjectUrls((prev) => ({ ...prev, [shortId]: objectUrl }));
    } catch (err) {
      setError((err as ApiError)?.message ?? "Falha ao carregar short");
    }
  };

  const createViewerLink = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ token: string; expiresAt: string }>(`/viewer-links`, {
        method: "POST",
        body: JSON.stringify({ appointmentId, ttlSeconds: 60 * 15 })
      });
      const url = `${window.location.origin}/viewer/${res.token}`;
      setViewerUrl(url);
    } catch (err) {
      setError((err as ApiError)?.message ?? "Falha ao criar link do viewer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <Link to="/agenda" style={{ color: "#dbe6ff" }}>
          Voltar à agenda
        </Link>
      </div>

      {error ? (
        <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,80,80,0.25)", background: "rgba(255,80,80,0.10)" }}>
          {error}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start" }}>
        <Panel title="Resumo">
          {session ? (
            <div style={{ display: "grid", gap: 8, fontSize: 13, opacity: 0.9 }}>
              <div>
                <strong>Status da sessão:</strong> {session.status}
              </div>
              <div>
                <strong>Agendamento:</strong> {new Date(session.appointment.startAt).toLocaleString()} —{" "}
                {new Date(session.appointment.endAt).toLocaleString()}
              </div>
              <div>
                <strong>Sala:</strong> {session.appointment.room.name}
              </div>
              <div>
                <strong>Terapeuta:</strong> {session.appointment.therapist.name}
              </div>
              <div>
                <strong>Protocolo:</strong> {session.appointment.protocol?.name ?? "—"}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                <button
                  disabled={loading || session.status !== "NOT_STARTED"}
                  onClick={() => void start()}
                  style={{
                    border: "1px solid rgba(219,230,255,0.2)",
                    background: "rgba(219,230,255,0.12)",
                    color: "#dbe6ff",
                    padding: "10px 12px",
                    borderRadius: 12,
                    cursor: loading || session.status !== "NOT_STARTED" ? "not-allowed" : "pointer",
                    fontWeight: 600
                  }}
                >
                  Iniciar
                </button>
                <button
                  disabled={loading || session.status !== "IN_PROGRESS"}
                  onClick={() => void end()}
                  style={{
                    border: "1px solid rgba(219,230,255,0.2)",
                    background: "rgba(219,230,255,0.08)",
                    color: "#dbe6ff",
                    padding: "10px 12px",
                    borderRadius: 12,
                    cursor: loading || session.status !== "IN_PROGRESS" ? "not-allowed" : "pointer"
                  }}
                >
                  Encerrar
                </button>
                <button
                  disabled={loading}
                  onClick={() => void createViewerLink()}
                  style={{
                    border: "1px solid rgba(219,230,255,0.2)",
                    background: "rgba(219,230,255,0.06)",
                    color: "#dbe6ff",
                    padding: "10px 12px",
                    borderRadius: 12,
                    cursor: loading ? "not-allowed" : "pointer"
                  }}
                >
                  Gerar link do viewer
                </button>
                <Link
                  to={`/session/${appointmentId}/live`}
                  style={{
                    color: "#dbe6ff",
                    textDecoration: "none",
                    border: "1px solid rgba(219,230,255,0.2)",
                    background: "rgba(219,230,255,0.06)",
                    padding: "10px 12px",
                    borderRadius: 12
                  }}
                >
                  Abrir transmissão
                </Link>
              </div>
              {viewerUrl ? (
                <div style={{ marginTop: 8, padding: 10, borderRadius: 12, border: "1px solid rgba(219,230,255,0.14)", background: "rgba(0,0,0,0.14)" }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Viewer</div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <a href={viewerUrl} target="_blank" rel="noreferrer" style={{ color: "#dbe6ff", wordBreak: "break-all" }}>
                      {viewerUrl}
                    </a>
                    <button
                      onClick={() => void navigator.clipboard.writeText(viewerUrl)}
                      style={{
                        border: "1px solid rgba(219,230,255,0.2)",
                        background: "rgba(219,230,255,0.08)",
                        color: "#dbe6ff",
                        padding: "8px 10px",
                        borderRadius: 12,
                        cursor: "pointer"
                      }}
                    >
                      Copiar
                    </button>
                  </div>
                </div>
              ) : null}
              <div style={{ marginTop: 8 }}>
                <button
                  disabled={loading}
                  onClick={() => void generateReport()}
                  style={{
                    border: "1px solid rgba(219,230,255,0.2)",
                    background: "rgba(219,230,255,0.12)",
                    color: "#dbe6ff",
                    padding: "10px 12px",
                    borderRadius: 12,
                    cursor: loading ? "not-allowed" : "pointer",
                    fontWeight: 600
                  }}
                >
                  Gerar relatório (PDF)
                </button>
                {reportUrl ? (
                  <div
                    style={{
                      marginTop: 8,
                      padding: 10,
                      borderRadius: 12,
                      border: "1px solid rgba(219,230,255,0.14)",
                      background: "rgba(0,0,0,0.14)",
                      display: "grid",
                      gap: 6
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <a href={reportUrl} target="_blank" rel="noreferrer" style={{ color: "#dbe6ff" }}>
                        Abrir PDF
                      </a>
                      <a
                        href={reportUrl}
                        download={`relatorio-${appointmentId}.pdf`}
                        style={{
                          color: "#dbe6ff",
                          textDecoration: "none",
                          border: "1px solid rgba(219,230,255,0.2)",
                          background: "rgba(219,230,255,0.08)",
                          padding: "8px 10px",
                          borderRadius: 12
                        }}
                      >
                        Baixar
                      </a>
                    </div>
                    {reportSha256 ? <div style={{ fontSize: 12, opacity: 0.85 }}>SHA-256: {reportSha256}</div> : null}
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div style={{ opacity: 0.85 }}>Carregando...</div>
          )}
        </Panel>

        <Panel title="Shorts">
          <div style={{ display: "grid", gap: 10 }}>
            {shorts.length === 0 ? <div style={{ opacity: 0.85 }}>Sem shorts</div> : null}
            {shorts.map((s) => (
              <div
                key={s.id}
                style={{
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(219,230,255,0.10)",
                  background: "rgba(0,0,0,0.14)",
                  display: "grid",
                  gap: 8
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <strong>{s.id.slice(0, 8)}</strong>
                  <span style={{ opacity: 0.85 }}>{new Date(s.createdAt).toLocaleString()}</span>
                </div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>
                  {Math.round(s.durationMs / 1000)}s • SHA-256: {s.sha256.slice(0, 16)}…
                </div>
                {shortObjectUrls[s.id] ? (
                  <video src={shortObjectUrls[s.id]} controls style={{ width: "100%", borderRadius: 12, background: "rgba(0,0,0,0.35)" }} />
                ) : (
                  <button
                    onClick={() => void loadShortObjectUrl(s.id)}
                    style={{
                      border: "1px solid rgba(219,230,255,0.2)",
                      background: "rgba(219,230,255,0.08)",
                      color: "#dbe6ff",
                      padding: "8px 10px",
                      borderRadius: 12,
                      cursor: "pointer",
                      justifySelf: "start"
                    }}
                  >
                    Carregar preview
                  </button>
                )}
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Observações">
          {session ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "grid", gap: 6 }}>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={3}
                  placeholder="Escreva uma observação..."
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(219,230,255,0.2)",
                    background: "rgba(219,230,255,0.06)",
                    color: "#dbe6ff",
                    resize: "vertical"
                  }}
                />
                <button
                  disabled={loading || !noteText.trim()}
                  onClick={() => void addNote()}
                  style={{
                    border: "1px solid rgba(219,230,255,0.2)",
                    background: "rgba(219,230,255,0.12)",
                    color: "#dbe6ff",
                    padding: "10px 12px",
                    borderRadius: 12,
                    cursor: loading || !noteText.trim() ? "not-allowed" : "pointer",
                    fontWeight: 600,
                    justifySelf: "start"
                  }}
                >
                  Registrar
                </button>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                {session.notes.length === 0 ? <div style={{ opacity: 0.85 }}>Sem observações</div> : null}
                {session.notes.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      padding: 12,
                      borderRadius: 14,
                      border: "1px solid rgba(219,230,255,0.10)",
                      background: "rgba(0,0,0,0.14)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <strong>{n.author.name}</strong>
                      <span style={{ opacity: 0.85 }}>{new Date(n.createdAt).toLocaleString()}</span>
                    </div>
                    <div style={{ opacity: 0.9, marginTop: 6 }}>{n.text}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ opacity: 0.85 }}>Carregando...</div>
          )}
        </Panel>
      </div>
    </div>
  );
}
