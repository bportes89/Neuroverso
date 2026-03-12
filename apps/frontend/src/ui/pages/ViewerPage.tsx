import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Room, Track } from "livekit-client";
import { apiFetch, type ApiError } from "../../lib/api";

type ViewerTokenResponse = { url: string; token: string; roomName: string };

type Short = { id: string; sha256: string; createdAt: string };

type ClipChunk = { ts: number; blob: Blob };

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

export function ViewerPage() {
  const params = useParams();
  const linkToken = params.token ?? "";

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<ClipChunk[]>([]);
  const remoteVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const remoteAudioTrackRef = useRef<MediaStreamTrack | null>(null);
  const [appointmentId, setAppointmentId] = useState<string>("");

  const [roomState, setRoomState] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [shorts, setShorts] = useState<Short[]>([]);
  const [uploading, setUploading] = useState(false);

  const bufferSeconds = 10;

  const title = useMemo(() => "Viewer", []);

  const refreshShorts = async () => {
    const list = await apiFetch<Short[]>(`/viewer-links/${linkToken}/shorts`);
    setShorts(list);
  };

  useEffect(() => {
    if (!linkToken) return;
    void refreshShorts().catch(() => null);
  }, [linkToken]);

  useEffect(() => {
    if (!linkToken) return;
    let room: Room | null = null;

    const run = async () => {
      setError(null);
      setRoomState("connecting");
      try {
        const info = await apiFetch<{ appointmentId: string }>(`/viewer-links/${linkToken}`);
        setAppointmentId(info.appointmentId);

        const auth = await apiFetch<ViewerTokenResponse>(`/viewer-links/${linkToken}/livekit-token`);
        room = new Room();

        const updateMediaStream = () => {
          if (!videoRef.current) return;
          const tracks = [remoteVideoTrackRef.current, remoteAudioTrackRef.current].filter(Boolean) as MediaStreamTrack[];
          if (tracks.length === 0) return;
          const stream = new MediaStream(tracks);
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => null);
          startRingBuffer(stream);
        };

        room.on("trackSubscribed", (track) => {
          if (track.kind === Track.Kind.Video) remoteVideoTrackRef.current = track.mediaStreamTrack;
          if (track.kind === Track.Kind.Audio) remoteAudioTrackRef.current = track.mediaStreamTrack;
          updateMediaStream();
        });

        room.on("trackUnsubscribed", (track) => {
          if (track.kind === Track.Kind.Video && remoteVideoTrackRef.current?.id === track.mediaStreamTrack.id) remoteVideoTrackRef.current = null;
          if (track.kind === Track.Kind.Audio && remoteAudioTrackRef.current?.id === track.mediaStreamTrack.id) remoteAudioTrackRef.current = null;
          updateMediaStream();
        });

        await room.connect(auth.url, auth.token);
        setRoomState("connected");
      } catch (err) {
        setRoomState("error");
        setError((err as ApiError)?.message ?? "Falha ao conectar no streaming");
      }
    };

    const startRingBuffer = (stream: MediaStream) => {
      if (mediaRecorderRef.current) return;
      const mr = new MediaRecorder(stream, { mimeType: "video/webm" });
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => {
        if (!e.data || e.data.size === 0) return;
        const now = Date.now();
        chunksRef.current.push({ ts: now, blob: e.data });
        const minTs = now - bufferSeconds * 1000;
        chunksRef.current = chunksRef.current.filter((c) => c.ts >= minTs);
      };
      mr.start(1000);
    };

    void run();

    return () => {
      try {
        mediaRecorderRef.current?.stop();
      } catch {}
      mediaRecorderRef.current = null;
      chunksRef.current = [];
      remoteVideoTrackRef.current = null;
      remoteAudioTrackRef.current = null;
      room?.disconnect();
      room = null;
      setRoomState("idle");
    };
  }, [linkToken]);

  const markMoment = async () => {
    setError(null);
    if (!appointmentId) return;
    const chunks = chunksRef.current.slice(-bufferSeconds);
    const blob = new Blob(chunks.map((c) => c.blob), { type: "video/webm" });
    if (blob.size === 0) {
      setError("Buffer ainda vazio");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("durationMs", String(bufferSeconds * 1000));
      form.append("file", blob, "short.webm");
      await fetch(`${(import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:4000"}/viewer-links/${linkToken}/shorts`, {
        method: "POST",
        body: form
      }).then(async (r) => {
        if (!r.ok) {
          const ct = r.headers.get("content-type") ?? "";
          const data = ct.includes("application/json") ? await r.json().catch(() => null) : await r.text();
          const msg = typeof (data as any)?.message === "string" ? (data as any).message : `Erro HTTP ${r.status}`;
          throw { status: r.status, message: msg, data } as ApiError;
        }
      });
      await refreshShorts();
    } catch (err) {
      setError((err as ApiError)?.message ?? "Falha ao enviar short");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <div style={{ opacity: 0.85 }}>
          {roomState === "connecting" ? "Conectando..." : null}
          {roomState === "connected" ? "Ao vivo" : null}
          {roomState === "error" ? "Erro" : null}
        </div>
      </div>

      {error ? (
        <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,80,80,0.25)", background: "rgba(255,80,80,0.10)" }}>
          {error}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 12, alignItems: "start" }}>
        <Panel title="Streaming">
          <video
            ref={videoRef}
            playsInline
            muted
            controls
            style={{ width: "100%", borderRadius: 14, background: "rgba(0,0,0,0.35)" }}
          />
        </Panel>

        <Panel title="Shorts clínicos">
          <div style={{ display: "grid", gap: 10 }}>
            <button
              disabled={uploading || roomState !== "connected"}
              onClick={() => void markMoment()}
              style={{
                border: "1px solid rgba(219,230,255,0.2)",
                background: "rgba(219,230,255,0.12)",
                color: "#dbe6ff",
                padding: "10px 12px",
                borderRadius: 12,
                cursor: uploading || roomState !== "connected" ? "not-allowed" : "pointer",
                fontWeight: 600
              }}
            >
              {uploading ? "Enviando..." : `Marcar momento (${bufferSeconds}s)`}
            </button>

            <div style={{ display: "grid", gap: 8 }}>
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
                    gap: 6
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <strong>{s.id.slice(0, 8)}</strong>
                    <span style={{ opacity: 0.85 }}>{new Date(s.createdAt).toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>SHA-256: {s.sha256.slice(0, 16)}…</div>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
