import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { createLocalTracks, Room, Track } from "livekit-client";
import { apiFetch, type ApiError } from "../../lib/api";

type PublishTokenResponse = { url: string; token: string; roomName: string };

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

export function LivePublishPage() {
  const params = useParams();
  const appointmentId = params.appointmentId ?? "";

  const [roomState, setRoomState] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const roomRef = useRef<Room | null>(null);

  const title = useMemo(() => "Transmissão (Terapeuta)", []);

  useEffect(() => {
    if (!appointmentId) return;

    const run = async () => {
      setError(null);
      setRoomState("connecting");
      try {
        const auth = await apiFetch<PublishTokenResponse>(`/streaming/appointments/${appointmentId}/publish-token`);
        const room = new Room();
        roomRef.current = room;

        room.on("trackSubscribed", (track) => {
          if (track.kind !== Track.Kind.Video) return;
          if (!remoteVideoRef.current) return;
          const stream = new MediaStream([track.mediaStreamTrack]);
          remoteVideoRef.current.srcObject = stream;
          remoteVideoRef.current.play().catch(() => null);
        });

        await room.connect(auth.url, auth.token);

        const tracks = await createLocalTracks({ audio: true, video: true });
        for (const t of tracks) {
          await room.localParticipant.publishTrack(t);
        }

        const videoTrack = tracks.find((t) => t.kind === Track.Kind.Video);
        if (videoTrack && localVideoRef.current) {
          const stream = new MediaStream([videoTrack.mediaStreamTrack]);
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.muted = true;
          localVideoRef.current.play().catch(() => null);
        }

        setRoomState("connected");
      } catch (err) {
        setRoomState("error");
        setError((err as ApiError)?.message ?? "Falha ao iniciar transmissão");
      }
    };

    void run();

    return () => {
      const room = roomRef.current;
      roomRef.current = null;
      try {
        room?.disconnect();
      } catch {}
      setRoomState("idle");
    };
  }, [appointmentId]);

  const toggleMute = async () => {
    const room = roomRef.current;
    if (!room) return;
    const enabled = !muted;
    setMuted(enabled);
    await room.localParticipant.setMicrophoneEnabled(!enabled);
  };

  const toggleCamera = async () => {
    const room = roomRef.current;
    if (!room) return;
    const off = !cameraOff;
    setCameraOff(off);
    await room.localParticipant.setCameraEnabled(!off);
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ opacity: 0.85 }}>
            {roomState === "connecting" ? "Conectando..." : null}
            {roomState === "connected" ? "Ao vivo" : null}
            {roomState === "error" ? "Erro" : null}
          </div>
          <Link to={`/session/${appointmentId}`} style={{ color: "#dbe6ff" }}>
            Voltar
          </Link>
        </div>
      </div>

      {error ? (
        <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,80,80,0.25)", background: "rgba(255,80,80,0.10)" }}>
          {error}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start" }}>
        <Panel title="Você (publicando)">
          <video
            ref={localVideoRef}
            playsInline
            muted
            controls={false}
            style={{ width: "100%", borderRadius: 14, background: "rgba(0,0,0,0.35)" }}
          />
          <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => void toggleMute()}
              disabled={roomState !== "connected"}
              style={{
                border: "1px solid rgba(219,230,255,0.2)",
                background: "rgba(219,230,255,0.08)",
                color: "#dbe6ff",
                padding: "10px 12px",
                borderRadius: 12,
                cursor: roomState !== "connected" ? "not-allowed" : "pointer"
              }}
            >
              {muted ? "Ativar microfone" : "Mutar microfone"}
            </button>
            <button
              onClick={() => void toggleCamera()}
              disabled={roomState !== "connected"}
              style={{
                border: "1px solid rgba(219,230,255,0.2)",
                background: "rgba(219,230,255,0.08)",
                color: "#dbe6ff",
                padding: "10px 12px",
                borderRadius: 12,
                cursor: roomState !== "connected" ? "not-allowed" : "pointer"
              }}
            >
              {cameraOff ? "Ligar câmera" : "Desligar câmera"}
            </button>
          </div>
        </Panel>

        <Panel title="Retorno (se existir)">
          <video
            ref={remoteVideoRef}
            playsInline
            controls
            style={{ width: "100%", borderRadius: 14, background: "rgba(0,0,0,0.35)" }}
          />
        </Panel>
      </div>
    </div>
  );
}

