import { useMemo, useState } from "react";
import { apiFetch, type ApiError } from "../../lib/api";

type SignatureRequest = {
  id: string;
  status: "created" | "pending_user" | "signed" | "rejected";
  documentHashSha256?: string;
  provider?: string;
};

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

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
  const [documentName, setDocumentName] = useState("documento.txt");
  const [documentText, setDocumentText] = useState("Conteúdo de exemplo do Neuroverso");
  const [lastRequest, setLastRequest] = useState<SignatureRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const computedBase64 = useMemo(() => btoa(unescape(encodeURIComponent(documentText))), [documentText]);

  const createRequestFromText = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<SignatureRequest>("/signatures/request", {
        method: "POST",
        body: JSON.stringify({ documentName, documentBase64: computedBase64 })
      });
      setLastRequest(res);
    } catch (err) {
      setError((err as ApiError)?.message ?? "Falha ao solicitar assinatura");
    } finally {
      setLoading(false);
    }
  };

  const createRequestFromFile = async (file: File) => {
    setError(null);
    setLoading(true);
    try {
      const base64 = await fileToBase64(file);
      const res = await apiFetch<SignatureRequest>("/signatures/request", {
        method: "POST",
        body: JSON.stringify({ documentName: file.name, documentBase64: base64 })
      });
      setLastRequest(res);
    } catch (err) {
      setError((err as ApiError)?.message ?? "Falha ao solicitar assinatura");
    } finally {
      setLoading(false);
    }
  };

  const refreshStatus = async () => {
    if (!lastRequest) return;
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<SignatureRequest>(`/signatures/${lastRequest.id}/status`);
      setLastRequest((prev) => (prev ? { ...prev, ...res } : res));
    } catch (err) {
      setError((err as ApiError)?.message ?? "Falha ao consultar status");
    } finally {
      setLoading(false);
    }
  };

  const completeStub = async () => {
    if (!lastRequest) return;
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<SignatureRequest>(`/signatures/${lastRequest.id}/complete`, { method: "POST" });
      setLastRequest((prev) => (prev ? { ...prev, ...res } : res));
    } catch (err) {
      setError((err as ApiError)?.message ?? "Falha ao completar assinatura");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>Assinaturas GOV.BR (stub)</h2>
        <div style={{ opacity: 0.85 }}>Fluxo pronto para trocar pelo provedor real.</div>
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
        <Panel title="Criar solicitação">
          <div style={{ display: "grid", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, opacity: 0.9 }}>Nome do documento</span>
              <input
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
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
              <span style={{ fontSize: 12, opacity: 0.9 }}>Conteúdo (texto)</span>
              <textarea
                value={documentText}
                onChange={(e) => setDocumentText(e.target.value)}
                rows={6}
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
              disabled={loading}
              onClick={() => void createRequestFromText()}
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
              Solicitar assinatura
            </button>

            <div style={{ opacity: 0.85, fontSize: 13 }}>
              Ou envie um arquivo:
              <input
                type="file"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void createRequestFromFile(f);
                }}
                style={{ display: "block", marginTop: 8 }}
              />
            </div>
          </div>
        </Panel>

        <Panel title="Status">
          {lastRequest ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "grid", gap: 6, fontSize: 13, opacity: 0.9 }}>
                <div>
                  <strong>ID:</strong> {lastRequest.id}
                </div>
                <div>
                  <strong>Status:</strong> {lastRequest.status}
                </div>
                {lastRequest.provider ? (
                  <div>
                    <strong>Provedor:</strong> {lastRequest.provider}
                  </div>
                ) : null}
                {lastRequest.documentHashSha256 ? (
                  <div>
                    <strong>Hash:</strong> {lastRequest.documentHashSha256}
                  </div>
                ) : null}
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  disabled={loading}
                  onClick={() => void refreshStatus()}
                  style={{
                    border: "1px solid rgba(219,230,255,0.2)",
                    background: "rgba(219,230,255,0.08)",
                    color: "#dbe6ff",
                    padding: "10px 12px",
                    borderRadius: 12,
                    cursor: loading ? "not-allowed" : "pointer"
                  }}
                >
                  Atualizar status
                </button>
                <button
                  disabled={loading || lastRequest.status === "signed"}
                  onClick={() => void completeStub()}
                  style={{
                    border: "1px solid rgba(219,230,255,0.2)",
                    background: "rgba(219,230,255,0.12)",
                    color: "#dbe6ff",
                    padding: "10px 12px",
                    borderRadius: 12,
                    cursor: loading || lastRequest.status === "signed" ? "not-allowed" : "pointer",
                    fontWeight: 600
                  }}
                >
                  Completar (stub)
                </button>
              </div>
            </div>
          ) : (
            <div style={{ opacity: 0.85 }}>Crie uma solicitação para acompanhar o status.</div>
          )}
        </Panel>
      </div>
    </div>
  );
}

