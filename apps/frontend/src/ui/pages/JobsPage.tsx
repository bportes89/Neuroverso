import { useEffect, useMemo, useState } from "react";
import { apiFetch, type ApiError } from "../../lib/api";
import { connectSse, type StreamEvent } from "../../lib/sse";

type Job = {
  id: string;
  name: string;
  enabled: boolean;
  intervalSeconds: number;
  nextRunAt: string;
  lastRunAt?: string;
};

type JobRunSummary = {
  id: string;
  status: "queued" | "running" | "succeeded" | "failed";
  startedAt?: string;
  finishedAt?: string;
  errorMessage?: string;
};

type JobRunDetail = {
  id: string;
  status: "queued" | "running" | "succeeded" | "failed";
  startedAt?: string;
  finishedAt?: string;
  events: Array<{ ts: string; type: string; message?: string; data?: unknown }>;
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

export function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [runs, setRuns] = useState<JobRunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [runDetail, setRunDetail] = useState<JobRunDetail | null>(null);
  const [streamEvents, setStreamEvents] = useState<StreamEvent[]>([]);
  const [createName, setCreateName] = useState("Processo Neuro");
  const [createInterval, setCreateInterval] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedJob = useMemo(() => jobs.find((j) => j.id === selectedJobId) ?? null, [jobs, selectedJobId]);

  const refreshJobs = async () => {
    const res = await apiFetch<Job[]>("/jobs");
    setJobs(res);
    if (res.length > 0 && !selectedJobId) setSelectedJobId(res[0].id);
  };

  const refreshRuns = async (jobId: string) => {
    const res = await apiFetch<JobRunSummary[]>(`/jobs/${jobId}/runs`);
    setRuns(res);
  };

  useEffect(() => {
    void refreshJobs().catch(() => null);
  }, []);

  useEffect(() => {
    if (!selectedJobId) return;
    void refreshRuns(selectedJobId).catch(() => null);
  }, [selectedJobId]);

  useEffect(() => {
    if (!selectedRunId) return;
    let cancelled = false;
    void apiFetch<JobRunDetail>(`/jobs/runs/${selectedRunId}`)
      .then((res) => {
        if (!cancelled) setRunDetail(res);
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [selectedRunId]);

  useEffect(() => {
    if (!runDetail) return;
    if (runDetail.status !== "running" && runDetail.status !== "queued") return;
    setStreamEvents([]);
    const disconnect = connectSse(`/stream/run/${runDetail.id}`, (ev) => {
      setStreamEvents((prev) => [ev, ...prev].slice(0, 200));
      if (ev.type === "finished" || ev.type === "error") void refreshRuns(selectedJobId ?? "");
    });
    return disconnect;
  }, [runDetail?.id, runDetail?.status]);

  const createJob = async () => {
    setError(null);
    setLoading(true);
    try {
      await apiFetch<{ id: string }>("/jobs", {
        method: "POST",
        body: JSON.stringify({
          name: createName,
          intervalSeconds: createInterval,
          enabled: true,
          payload: { kind: "demo", createdFrom: "frontend" }
        })
      });
      await refreshJobs();
    } catch (err) {
      setError((err as ApiError)?.message ?? "Falha ao criar job");
    } finally {
      setLoading(false);
    }
  };

  const runJob = async () => {
    if (!selectedJobId) return;
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ runId: string }>(`/jobs/${selectedJobId}/run`, { method: "POST" });
      await refreshRuns(selectedJobId);
      setSelectedRunId(res.runId);
    } catch (err) {
      setError((err as ApiError)?.message ?? "Falha ao executar job");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>Agendamentos</h2>
        <button
          onClick={() => {
            if (selectedJobId) void refreshRuns(selectedJobId);
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
          Atualizar
        </button>
      </div>

      {error ? (
        <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,80,80,0.25)", background: "rgba(255,80,80,0.10)" }}>
          {error}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 12, alignItems: "start" }}>
        <Panel title="Jobs">
          <div style={{ display: "grid", gap: 8 }}>
            <select
              value={selectedJobId ?? ""}
              onChange={(e) => {
                setSelectedJobId(e.target.value);
                setSelectedRunId(null);
                setRunDetail(null);
                setStreamEvents([]);
              }}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(219,230,255,0.2)",
                background: "rgba(219,230,255,0.06)",
                color: "#dbe6ff"
              }}
            >
              {jobs.length === 0 ? <option value="">Nenhum job</option> : null}
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.name}
                </option>
              ))}
            </select>

            {selectedJob ? (
              <div style={{ opacity: 0.9, fontSize: 13, lineHeight: 1.5 }}>
                <div>
                  <strong>Intervalo:</strong> {selectedJob.intervalSeconds}s
                </div>
                <div>
                  <strong>Próxima execução:</strong> {new Date(selectedJob.nextRunAt).toLocaleString()}
                </div>
                <div>
                  <strong>Última execução:</strong>{" "}
                  {selectedJob.lastRunAt ? new Date(selectedJob.lastRunAt).toLocaleString() : "—"}
                </div>
              </div>
            ) : null}

            <button
              disabled={!selectedJobId || loading}
              onClick={runJob}
              style={{
                border: "1px solid rgba(219,230,255,0.2)",
                background: "rgba(219,230,255,0.12)",
                color: "#dbe6ff",
                padding: "10px 12px",
                borderRadius: 12,
                cursor: !selectedJobId || loading ? "not-allowed" : "pointer",
                fontWeight: 600
              }}
            >
              Executar agora
            </button>

            <div style={{ height: 1, background: "rgba(219,230,255,0.12)", margin: "8px 0" }} />

            <div style={{ fontWeight: 700, fontSize: 13 }}>Novo job</div>
            <input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(219,230,255,0.2)",
                background: "rgba(219,230,255,0.06)",
                color: "#dbe6ff"
              }}
            />
            <label style={{ display: "grid", gap: 6, fontSize: 12, opacity: 0.9 }}>
              Intervalo (segundos)
              <input
                value={createInterval}
                onChange={(e) => setCreateInterval(Number(e.target.value))}
                type="number"
                min={5}
                max={86400}
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
              disabled={loading}
              onClick={createJob}
              style={{
                border: "1px solid rgba(219,230,255,0.2)",
                background: "rgba(219,230,255,0.08)",
                color: "#dbe6ff",
                padding: "10px 12px",
                borderRadius: 12,
                cursor: loading ? "not-allowed" : "pointer"
              }}
            >
              Criar
            </button>
          </div>
        </Panel>

        <div style={{ display: "grid", gap: 12 }}>
          <Panel title="Execuções">
            <div style={{ display: "grid", gap: 8 }}>
              <select
                value={selectedRunId ?? ""}
                onChange={(e) => {
                  const id = e.target.value || null;
                  setSelectedRunId(id);
                  setStreamEvents([]);
                }}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(219,230,255,0.2)",
                  background: "rgba(219,230,255,0.06)",
                  color: "#dbe6ff"
                }}
              >
                {runs.length === 0 ? <option value="">Nenhuma execução</option> : <option value="">Selecione</option>}
                {runs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.status} — {r.startedAt ? new Date(r.startedAt).toLocaleString() : r.id}
                  </option>
                ))}
              </select>

              {runDetail ? (
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 13, opacity: 0.9 }}>
                    <div>
                      <strong>Status:</strong> {runDetail.status}
                    </div>
                    <div>
                      <strong>Início:</strong> {runDetail.startedAt ? new Date(runDetail.startedAt).toLocaleString() : "—"}
                    </div>
                    <div>
                      <strong>Fim:</strong> {runDetail.finishedAt ? new Date(runDetail.finishedAt).toLocaleString() : "—"}
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>Eventos gravados</div>
                      <div
                        style={{
                          maxHeight: 240,
                          overflow: "auto",
                          borderRadius: 12,
                          border: "1px solid rgba(219,230,255,0.14)",
                          background: "rgba(0,0,0,0.16)",
                          padding: 10,
                          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                          fontSize: 12
                        }}
                      >
                        {runDetail.events.length === 0 ? (
                          <div style={{ opacity: 0.75 }}>Sem eventos</div>
                        ) : (
                          runDetail.events
                            .slice()
                            .reverse()
                            .map((ev, idx) => (
                              <div key={idx} style={{ padding: "4px 0", borderBottom: "1px solid rgba(219,230,255,0.08)" }}>
                                <div style={{ opacity: 0.8 }}>
                                  {new Date(ev.ts).toLocaleTimeString()} — {ev.type}
                                </div>
                                {ev.message ? <div>{ev.message}</div> : null}
                              </div>
                            ))
                        )}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>Streaming em tempo real</div>
                      <div
                        style={{
                          maxHeight: 240,
                          overflow: "auto",
                          borderRadius: 12,
                          border: "1px solid rgba(219,230,255,0.14)",
                          background: "rgba(0,0,0,0.16)",
                          padding: 10,
                          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                          fontSize: 12
                        }}
                      >
                        {streamEvents.length === 0 ? (
                          <div style={{ opacity: 0.75 }}>
                            {runDetail.status === "running" || runDetail.status === "queued" ? "Conectando..." : "Sem streaming"}
                          </div>
                        ) : (
                          streamEvents.map((ev, idx) => (
                            <div key={idx} style={{ padding: "4px 0", borderBottom: "1px solid rgba(219,230,255,0.08)" }}>
                              <div style={{ opacity: 0.8 }}>
                                {new Date(ev.ts).toLocaleTimeString()} — {ev.type}
                              </div>
                              {ev.message ? <div>{ev.message}</div> : null}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ opacity: 0.85 }}>Selecione uma execução para ver detalhes e streaming.</div>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
