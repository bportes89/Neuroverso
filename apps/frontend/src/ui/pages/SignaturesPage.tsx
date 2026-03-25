import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiFetch, getApiBaseUrl, type ApiError } from "../../lib/api";
import { getToken } from "../../lib/auth";

type SignatureStatus = "PENDING" | "SIGNED" | "DECLINED" | "EXPIRED" | "FAILED";

type Signature = {
  id: string;
  reportId: string;
  provider: string;
  status: SignatureStatus;
  signUrl?: string | null;
  expiresAt?: string | null;
  signedAt?: string | null;
  signedByName?: string | null;
  signedByDocument?: string | null;
  sha256: string;
  signedSha256?: string | null;
  createdAt: string;
  updatedAt: string;
};

type InboxItem = Signature & { report?: { appointmentId: string; appointment?: { child?: { name: string } } } };

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

export function SignaturesPage() {
  const [searchParams] = useSearchParams();
  const prefillReportId = useMemo(() => searchParams.get("reportId") ?? "", [searchParams]);

  const [reportId, setReportId] = useState(prefillReportId);
  const [provider, setProvider] = useState("MOCK");
  const [signerName, setSignerName] = useState("");
  const [signerDocument, setSignerDocument] = useState("");
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [pending, setPending] = useState<InboxItem[]>([]);
  const [history, setHistory] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const objectUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    setReportId(prefillReportId);
  }, [prefillReportId]);

  const refresh = async (id: string) => {
    const rid = id.trim();
    if (!rid) return;
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<Signature[]>(`/signatures/reports/${rid}`);
      setSignatures(res);
    } catch (err) {
      setError((err as ApiError)?.message ?? "Falha ao listar assinaturas");
    } finally {
      setLoading(false);
    }
  };

  const refreshInbox = async () => {
    setError(null);
    try {
      const [p, h] = await Promise.all([
        apiFetch<{ items: InboxItem[] }>(`/signatures?status=PENDING&limit=20`),
        apiFetch<{ items: InboxItem[] }>(`/signatures?limit=20`)
      ]);
      setPending(p.items ?? []);
      setHistory((h.items ?? []).filter((x) => x.status !== "PENDING"));
    } catch (err) {
      setError((err as ApiError)?.message ?? "Falha ao carregar pendências");
    }
  };

  useEffect(() => {
    if (!prefillReportId) return;
    void refresh(prefillReportId).catch(() => null);
  }, [prefillReportId]);

  useEffect(() => {
    void refreshInbox().catch(() => null);
  }, []);

  useEffect(() => {
    return () => {
      for (const u of objectUrlsRef.current) URL.revokeObjectURL(u);
      objectUrlsRef.current = [];
    };
  }, []);

  const createSignature = async () => {
    const rid = reportId.trim();
    if (!rid) return;
    setError(null);
    setLoading(true);
    try {
      if (provider === "GOVBR") {
        const start = await apiFetch<{ id: string; signUrl: string; expiresAt: string }>(`/signatures/reports/${rid}/start-govbr`, {
          method: "POST",
          body: JSON.stringify({})
        });
        window.location.href = start.signUrl;
      } else {
        await apiFetch<{ id: string }>(`/signatures/reports/${rid}`, {
          method: "POST",
          body: JSON.stringify({
            provider,
            signerName: signerName.trim() ? signerName.trim() : undefined,
            signerDocument: signerDocument.trim() ? signerDocument.trim() : undefined
          })
        });
        await refresh(rid);
      }
    } catch (err) {
      setError((err as ApiError)?.message ?? "Falha ao assinar relatório");
    } finally {
      setLoading(false);
    }
  };

  const downloadSignature = async (id: string) => {
    setError(null);
    try {
      const apiBase = getApiBaseUrl();
      const url = `${apiBase}/signatures/${id}/download`;
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
      window.open(objectUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError((err as ApiError)?.message ?? "Falha ao baixar assinatura");
    }
  };

  const createSecureLink = async (resource: "REPORT_PDF" | "SIGNED_REPORT_PDF" | "SIGNATURE_EVIDENCE", resourceId: string) => {
    setError(null);
    try {
      const res = await apiFetch<{ url: string }>(`/signed-urls`, {
        method: "POST",
        body: JSON.stringify({ resource, resourceId, ttlSeconds: 60 * 15 })
      });
      window.open(res.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError((err as ApiError)?.message ?? "Falha ao gerar URL assinada");
    }
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>Assinaturas</h2>
        <div style={{ opacity: 0.85 }}>Pendências + histórico + assinatura (MOCK/GOV.BR).</div>
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start" }}>
        <Panel title="Assinaturas pendentes">
          <div style={{ display: "grid", gap: 10 }}>
            <button
              disabled={loading}
              onClick={() => void refreshInbox()}
              style={{
                justifySelf: "start",
                border: "1px solid rgba(219,230,255,0.2)",
                background: "rgba(219,230,255,0.08)",
                color: "#dbe6ff",
                padding: "8px 10px",
                borderRadius: 12,
                cursor: loading ? "not-allowed" : "pointer"
              }}
            >
              Recarregar pendências
            </button>
            {pending.length === 0 ? <div style={{ opacity: 0.85 }}>Sem pendências</div> : null}
            {pending.map((s) => (
              <div
                key={s.id}
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
                  <div style={{ fontWeight: 700 }}>{s.id}</div>
                  <div style={{ opacity: 0.85 }}>{new Date(s.createdAt).toLocaleString()}</div>
                </div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>
                  Report: {s.reportId} {s.report?.appointment?.child?.name ? `• ${s.report.appointment.child.name}` : ""}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  {s.signUrl ? (
                    <a href={s.signUrl} target="_blank" rel="noreferrer" style={{ color: "#dbe6ff" }}>
                      Abrir assinatura
                    </a>
                  ) : null}
                  <button
                    onClick={() => void createSecureLink("REPORT_PDF", s.reportId)}
                    style={{
                      border: "1px solid rgba(219,230,255,0.2)",
                      background: "rgba(219,230,255,0.08)",
                      color: "#dbe6ff",
                      padding: "8px 10px",
                      borderRadius: 12,
                      cursor: "pointer"
                    }}
                  >
                    Link seguro (PDF)
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Histórico (últimos 20)">
          <div style={{ display: "grid", gap: 10 }}>
            {history.length === 0 ? <div style={{ opacity: 0.85 }}>Sem histórico</div> : null}
            {history.map((s) => (
              <div
                key={s.id}
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
                  <div style={{ fontWeight: 700 }}>{s.id}</div>
                  <div style={{ opacity: 0.85 }}>{new Date(s.createdAt).toLocaleString()}</div>
                </div>
                <div style={{ fontSize: 13, opacity: 0.9 }}>
                  <strong>Status:</strong> {s.status} • <strong>Provedor:</strong> {s.provider}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <button
                    onClick={() => void createSecureLink("SIGNATURE_EVIDENCE", s.id)}
                    style={{
                      border: "1px solid rgba(219,230,255,0.2)",
                      background: "rgba(219,230,255,0.08)",
                      color: "#dbe6ff",
                      padding: "8px 10px",
                      borderRadius: 12,
                      cursor: "pointer"
                    }}
                  >
                    Link seguro (evidência)
                  </button>
                  {s.status === "SIGNED" ? (
                    <button
                      onClick={() => void createSecureLink("SIGNED_REPORT_PDF", s.id)}
                      style={{
                        border: "1px solid rgba(219,230,255,0.2)",
                        background: "rgba(219,230,255,0.08)",
                        color: "#dbe6ff",
                        padding: "8px 10px",
                        borderRadius: 12,
                        cursor: "pointer"
                      }}
                    >
                      Link seguro (PKCS7)
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Assinar relatório">
          <div style={{ display: "grid", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, opacity: 0.9 }}>Report ID</span>
              <input
                value={reportId}
                onChange={(e) => setReportId(e.target.value)}
                placeholder="UUID do SessionReport"
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(219,230,255,0.2)",
                  background: "rgba(219,230,255,0.06)",
                  color: "#dbe6ff"
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, opacity: 0.9 }}>Provedor</span>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(219,230,255,0.2)",
                  background: "rgba(219,230,255,0.06)",
                  color: "#dbe6ff"
                }}
              >
                <option value="MOCK">MOCK</option>
                <option value="GOVBR">GOV.BR</option>
              </select>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, opacity: 0.9 }}>Nome do signatário (opcional)</span>
              <input
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(219,230,255,0.2)",
                  background: "rgba(219,230,255,0.06)",
                  color: "#dbe6ff"
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, opacity: 0.9 }}>Documento do signatário (opcional)</span>
              <input
                value={signerDocument}
                onChange={(e) => setSignerDocument(e.target.value)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(219,230,255,0.2)",
                  background: "rgba(219,230,255,0.06)",
                  color: "#dbe6ff"
                }}
              />
            </label>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                disabled={loading || !reportId.trim()}
                onClick={() => void createSignature()}
                style={{
                  border: "1px solid rgba(219,230,255,0.2)",
                  background: "rgba(219,230,255,0.12)",
                  color: "#dbe6ff",
                  padding: "10px 12px",
                  borderRadius: 12,
                  cursor: loading || !reportId.trim() ? "not-allowed" : "pointer",
                  fontWeight: 600
                }}
              >
                {provider === "GOVBR" ? "Assinar via GOV.BR" : "Assinar (MOCK)"}
              </button>
              <button
                disabled={loading || !reportId.trim()}
                onClick={() => void refresh(reportId)}
                style={{
                  border: "1px solid rgba(219,230,255,0.2)",
                  background: "rgba(219,230,255,0.08)",
                  color: "#dbe6ff",
                  padding: "10px 12px",
                  borderRadius: 12,
                  cursor: loading || !reportId.trim() ? "not-allowed" : "pointer"
                }}
              >
                Recarregar lista
              </button>
            </div>
        </div>
        </Panel>

        <Panel title="Assinaturas do relatório">
          {signatures.length > 0 ? (
            <div style={{ display: "grid", gap: 10 }}>
              {signatures.map((s) => (
                <div
                  key={s.id}
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
                    <div style={{ fontWeight: 700 }}>{s.id}</div>
                    <div style={{ opacity: 0.85 }}>{new Date(s.createdAt).toLocaleString()}</div>
                  </div>
                  <div style={{ display: "grid", gap: 4, fontSize: 13, opacity: 0.9 }}>
                    <div>
                      <strong>Status:</strong> {s.status}
                    </div>
                    <div>
                      <strong>Provedor:</strong> {s.provider}
                    </div>
                    {s.expiresAt ? (
                      <div style={{ fontSize: 12, opacity: 0.85 }}>Expira em: {new Date(s.expiresAt).toLocaleString()}</div>
                    ) : null}
                    {s.signedAt ? (
                      <div style={{ fontSize: 12, opacity: 0.85 }}>Assinado em: {new Date(s.signedAt).toLocaleString()}</div>
                    ) : null}
                    <div style={{ fontSize: 12, opacity: 0.85 }}>
                      SHA-256: {s.sha256}
                    </div>
                    {s.signedSha256 ? <div style={{ fontSize: 12, opacity: 0.85 }}>Assinatura SHA-256: {s.signedSha256}</div> : null}
                    {s.signedByName ? (
                      <div style={{ fontSize: 12, opacity: 0.85 }}>
                        Signatário: {s.signedByName}
                        {s.signedByDocument ? ` (${s.signedByDocument})` : ""}
                      </div>
                    ) : null}
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      disabled={loading}
                      onClick={() => void downloadSignature(s.id)}
                      style={{
                        border: "1px solid rgba(219,230,255,0.2)",
                        background: "rgba(219,230,255,0.08)",
                        color: "#dbe6ff",
                        padding: "8px 10px",
                        borderRadius: 12,
                        cursor: loading ? "not-allowed" : "pointer"
                      }}
                    >
                      Baixar evidência (JSON)
                    </button>
                    <button
                      disabled={loading}
                      onClick={() => void createSecureLink("SIGNATURE_EVIDENCE", s.id)}
                      style={{
                        border: "1px solid rgba(219,230,255,0.2)",
                        background: "rgba(219,230,255,0.08)",
                        color: "#dbe6ff",
                        padding: "8px 10px",
                        borderRadius: 12,
                        cursor: loading ? "not-allowed" : "pointer"
                      }}
                    >
                      Link seguro (evidência)
                    </button>
                    {s.status === "SIGNED" ? (
                      <button
                        disabled={loading}
                        onClick={() => void createSecureLink("SIGNED_REPORT_PDF", s.id)}
                        style={{
                          border: "1px solid rgba(219,230,255,0.2)",
                          background: "rgba(219,230,255,0.08)",
                          color: "#dbe6ff",
                          padding: "8px 10px",
                          borderRadius: 12,
                          cursor: loading ? "not-allowed" : "pointer"
                        }}
                      >
                        Link seguro (PKCS7)
                      </button>
                    ) : null}
                    {s.signUrl && s.status === "PENDING" ? (
                      <a href={s.signUrl} target="_blank" rel="noreferrer" style={{ color: "#dbe6ff", alignSelf: "center" }}>
                        Abrir assinatura
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ opacity: 0.85 }}>Informe um Report ID e carregue/assine para ver as evidências.</div>
          )}
        </Panel>
      </div>
    </div>
  );
}
