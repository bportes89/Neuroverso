import { useEffect, useMemo, useState } from "react";
import { apiFetch, type ApiError } from "../../lib/api";

type Job = {
  id: string;
  name: string;
};

type Report = {
  job: Job;
  window: { from: string; to: string };
  totals: { total: number; succeeded: number; failed: number; running: number };
  recentRuns: Array<{ id: string; status: string; startedAt?: string; finishedAt?: string; errorMessage?: string }>;
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

export function ReportsPage() {
  const [jobs, setJobs] = useState<Array<{ id: string; name: string }>>([]);
  const [jobId, setJobId] = useState<string>("");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedJob = useMemo(() => jobs.find((j) => j.id === jobId) ?? null, [jobs, jobId]);

  useEffect(() => {
    void (async () => {
      const res = await apiFetch<Array<{ id: string; name: string }>>("/jobs");
      setJobs(res.map((j) => ({ id: j.id, name: j.name })));
      if (res.length > 0) setJobId(res[0].id);
    })().catch(() => null);
  }, []);

  const loadReport = async () => {
    if (!jobId) return;
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<Report>(`/reports/jobs/${jobId}`);
      setReport(res);
    } catch (err) {
      setError((err as ApiError)?.message ?? "Falha ao gerar relatório");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!jobId) return;
    void loadReport().catch(() => null);
  }, [jobId]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>Relatórios</h2>
        <button
          onClick={() => void loadReport()}
          disabled={!jobId || loading}
          style={{
            border: "1px solid rgba(219,230,255,0.2)",
            background: "rgba(219,230,255,0.08)",
            color: "#dbe6ff",
            padding: "10px 12px",
            borderRadius: 10,
            cursor: !jobId || loading ? "not-allowed" : "pointer"
          }}
        >
          Atualizar
        </button>
      </div>

      {error ? (
        <div
          style={{
            padding: 12,
            borderRadius: 14,
            border: "1px solid rgba(255,80,80,0.25)",
            background: "rgba(255,80,80,0.10)"
          }}
        >
          {error}
        </div>
      ) : null}

      <Panel title="Filtro">
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(219,230,255,0.2)",
              background: "rgba(219,230,255,0.06)",
              color: "#dbe6ff",
              minWidth: 260
            }}
          >
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.name}
              </option>
            ))}
          </select>
          <div style={{ opacity: 0.85 }}>{selectedJob ? `Job: ${selectedJob.name}` : "Nenhum job"}</div>
        </div>
      </Panel>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Panel title="Totais">
          {report ? (
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ opacity: 0.9 }}>
                <strong>Janela:</strong> {new Date(report.window.from).toLocaleString()} →{" "}
                {new Date(report.window.to).toLocaleString()}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                <div style={{ padding: 12, borderRadius: 14, background: "rgba(0,0,0,0.14)" }}>
                  <div style={{ opacity: 0.85 }}>Total</div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>{report.totals.total}</div>
                </div>
                <div style={{ padding: 12, borderRadius: 14, background: "rgba(0,0,0,0.14)" }}>
                  <div style={{ opacity: 0.85 }}>Sucesso</div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>{report.totals.succeeded}</div>
                </div>
                <div style={{ padding: 12, borderRadius: 14, background: "rgba(0,0,0,0.14)" }}>
                  <div style={{ opacity: 0.85 }}>Falha</div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>{report.totals.failed}</div>
                </div>
                <div style={{ padding: 12, borderRadius: 14, background: "rgba(0,0,0,0.14)" }}>
                  <div style={{ opacity: 0.85 }}>Em andamento</div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>{report.totals.running}</div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ opacity: 0.85 }}>Selecione um job para gerar relatório.</div>
          )}
        </Panel>

        <Panel title="Execuções recentes">
          {report ? (
            <div style={{ display: "grid", gap: 8 }}>
              {report.recentRuns.length === 0 ? (
                <div style={{ opacity: 0.85 }}>Sem execuções no período.</div>
              ) : (
                report.recentRuns.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      padding: 12,
                      borderRadius: 14,
                      background: "rgba(0,0,0,0.14)",
                      border: "1px solid rgba(219,230,255,0.10)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <strong>{r.status}</strong>
                      <span style={{ opacity: 0.85 }}>
                        {r.startedAt ? new Date(r.startedAt).toLocaleString() : "—"}
                      </span>
                    </div>
                    {r.errorMessage ? <div style={{ opacity: 0.85, marginTop: 6 }}>{r.errorMessage}</div> : null}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div style={{ opacity: 0.85 }}>Sem dados.</div>
          )}
        </Panel>
      </div>
    </div>
  );
}

