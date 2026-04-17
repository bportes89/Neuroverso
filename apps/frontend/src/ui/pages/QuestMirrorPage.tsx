import { useEffect, useMemo, useRef, useState } from "react";
import { createLocalTracks, Room, Track } from "livekit-client";
import { useParams } from "react-router-dom";
import { apiFetch, type ApiError } from "../../lib/api";

type MirrorInfo = {
  appointmentId: string;
  deviceId: string;
  deviceName: string;
  roomName: string;
  therapistName: string;
  sessionStatus: "NOT_STARTED" | "IN_PROGRESS" | "FINISHED";
  expiresAt: string;
};

type MirrorTokenResponse = { url: string; token: string; roomName: string };

function actionButtonStyle(disabled: boolean, emphasis: "primary" | "secondary" = "secondary") {
  return {
    border: disabled ? "1px solid rgba(150,170,210,0.45)" : "1px solid rgba(219,230,255,0.2)",
    background: disabled
      ? "rgba(24,32,52,0.9)"
      : emphasis === "primary"
        ? "rgba(219,230,255,0.14)"
        : "rgba(219,230,255,0.08)",
    color: disabled ? "rgba(235,242,255,0.82)" : "#dbe6ff",
    padding: "10px 12px",
    borderRadius: 12,
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: emphasis === "primary" ? 600 : 500,
    opacity: 1 as const
  };
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

export function QuestMirrorPage() {
  const params = useParams();
  const linkToken = params.token ?? "";

  const [info, setInfo] = useState<MirrorInfo | null>(null);
  const [roomState, setRoomState] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  const roomRef = useRef<Room | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const title = useMemo(() => "Meta Quest • Espelhamento", []);

  useEffect(() => {
    if (!linkToken) return;
    void apiFetch<MirrorInfo>(`/device-mirror-links/${linkToken}`)
      .then(setInfo)
      .catch((err) => setError((err as ApiError)?.message ?? "Falha ao carregar link de espelhamento"));
  }, [linkToken]);

  useEffect(() => {
    return () => {
      try {
        roomRef.current?.disconnect();
      } catch {}
      roomRef.current = null;
    };
  }, []);

  const connect = async () => {
    if (!linkToken) return;
    setError(null);
    setRoomState("connecting");

    try {
      const auth = await apiFetch<MirrorTokenResponse>(`/device-mirror-links/${linkToken}/livekit-token`);
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
      for (const track of tracks) {
        await room.localParticipant.publishTrack(track);
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
      setError((err as ApiError)?.message ?? "Falha ao iniciar espelhamento");
    }
  };

  const disconnect = () => {
    try {
      roomRef.current?.disconnect();
    } catch {}
    roomRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setRoomState("idle");
    setMuted(false);
    setCameraOff(false);
  };

  const toggleMute = async () => {
    const room = roomRef.current;
    if (!room) return;
    const nextMuted = !muted;
    setMuted(nextMuted);
    await room.localParticipant.setMicrophoneEnabled(!nextMuted);
  };

  const toggleCamera = async () => {
    const room = roomRef.current;
    if (!room) return;
    const nextCameraOff = !cameraOff;
    setCameraOff(nextCameraOff);
    await room.localParticipant.setCameraEnabled(!nextCameraOff);
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

      <Panel title="Sessão">
        {info ? (
          <div style={{ display: "grid", gap: 8, fontSize: 14, opacity: 0.92 }}>
            <div>
              <strong>Dispositivo:</strong> {info.deviceName}
            </div>
            <div>
              <strong>Terapeuta:</strong> {info.therapistName}
            </div>
            <div>
              <strong>Sala:</strong> {info.roomName}
            </div>
            <div>
              <strong>Status da sessão:</strong> {info.sessionStatus}
            </div>
            <div>
              <strong>Validade do link:</strong> {new Date(info.expiresAt).toLocaleString()}
            </div>
            <div style={{ fontSize: 12, opacity: 0.82 }}>
              Esta primeira versão usa a captura de câmera e microfone do navegador do Meta Quest. O espelhamento nativo de apps imersivos do Quest ainda exige integração específica fora do navegador.
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
              {(() => {
                const disabled = roomState === "connecting" || roomState === "connected" || info.sessionStatus !== "IN_PROGRESS";
                return (
              <button
                disabled={disabled}
                onClick={() => void connect()}
                style={actionButtonStyle(disabled, "primary")}
              >
                Entrar no espelhamento
              </button>
                );
              })()}
              {(() => {
                const disabled = roomState !== "connected";
                return (
              <button
                disabled={disabled}
                onClick={disconnect}
                style={actionButtonStyle(disabled)}
              >
                Sair
              </button>
                );
              })()}
            </div>
          </div>
        ) : (
          <div style={{ opacity: 0.85 }}>Carregando link...</div>
        )}
      </Panel>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start" }}>
        <Panel title="Meta Quest">
          <video
            ref={localVideoRef}
            playsInline
            muted
            controls={false}
            style={{ width: "100%", borderRadius: 14, background: "rgba(0,0,0,0.35)" }}
          />
          <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
            {(() => {
              const disabled = roomState !== "connected";
              return (
            <button
              onClick={() => void toggleMute()}
              disabled={disabled}
              style={actionButtonStyle(disabled)}
            >
              {muted ? "Ativar microfone" : "Mutar microfone"}
            </button>
              );
            })()}
            {(() => {
              const disabled = roomState !== "connected";
              return (
            <button
              onClick={() => void toggleCamera()}
              disabled={disabled}
              style={actionButtonStyle(disabled)}
            >
              {cameraOff ? "Ligar câmera" : "Desligar câmera"}
            </button>
              );
            })()}
          </div>
        </Panel>

        <Panel title="Retorno da sessão">
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
