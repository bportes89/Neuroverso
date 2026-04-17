import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { createLocalAudioTrack, createLocalScreenTracks, createLocalTracks, type LocalTrack, Room, Track } from "livekit-client";
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
  const [sourceMode, setSourceMode] = useState<"screen" | "camera">("screen");
  const [includeMicrophone, setIncludeMicrophone] = useState(true);
  const [includeScreenAudio, setIncludeScreenAudio] = useState(true);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const roomRef = useRef<Room | null>(null);
  const localTracksRef = useRef<LocalTrack[]>([]);
  const remoteVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const remoteAudioTrackRef = useRef<MediaStreamTrack | null>(null);

  const title = useMemo(() => "Transmissão (Terapeuta)", []);

  useEffect(() => {
    return () => {
      void disconnect();
    };
  }, []);

  const syncRemotePreview = () => {
    if (!remoteVideoRef.current) return;
    const tracks = [remoteVideoTrackRef.current, remoteAudioTrackRef.current].filter(Boolean) as MediaStreamTrack[];
    if (tracks.length === 0) {
      remoteVideoRef.current.srcObject = null;
      return;
    }
    const stream = new MediaStream(tracks);
    remoteVideoRef.current.srcObject = stream;
    remoteVideoRef.current.play().catch(() => null);
  };

  const syncLocalPreview = () => {
    if (!localVideoRef.current) return;
    const localVideoTrack = localTracksRef.current.find((track) => track.kind === Track.Kind.Video && !track.isMuted);
    if (!localVideoTrack) {
      localVideoRef.current.srcObject = null;
      return;
    }
    const stream = new MediaStream([localVideoTrack.mediaStreamTrack]);
    localVideoRef.current.srcObject = stream;
    localVideoRef.current.muted = true;
    localVideoRef.current.play().catch(() => null);
  };

  const stopLocalTracks = () => {
    for (const track of localTracksRef.current) {
      try {
        track.stop();
      } catch {}
    }
    localTracksRef.current = [];
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
  };

  async function disconnect() {
    const room = roomRef.current;
    roomRef.current = null;
    remoteVideoTrackRef.current = null;
    remoteAudioTrackRef.current = null;
    try {
      room?.disconnect();
    } catch {}
    syncRemotePreview();
    stopLocalTracks();
    setRoomState("idle");
    setMuted(false);
    setCameraOff(false);
  }

  const connect = async () => {
    if (!appointmentId || roomState === "connecting" || roomState === "connected") return;
    setError(null);
    setRoomState("connecting");
    stopLocalTracks();

    try {
      const auth = await apiFetch<PublishTokenResponse>(`/streaming/appointments/${appointmentId}/publish-token`);
      const room = new Room();
      roomRef.current = room;

      room.on("trackSubscribed", (track) => {
        if (track.kind === Track.Kind.Video) remoteVideoTrackRef.current = track.mediaStreamTrack;
        if (track.kind === Track.Kind.Audio) remoteAudioTrackRef.current = track.mediaStreamTrack;
        syncRemotePreview();
      });

      room.on("trackUnsubscribed", (track) => {
        if (track.kind === Track.Kind.Video && remoteVideoTrackRef.current?.id === track.mediaStreamTrack.id) remoteVideoTrackRef.current = null;
        if (track.kind === Track.Kind.Audio && remoteAudioTrackRef.current?.id === track.mediaStreamTrack.id) remoteAudioTrackRef.current = null;
        syncRemotePreview();
      });

      await room.connect(auth.url, auth.token);

      const tracks: LocalTrack[] =
        sourceMode === "screen"
          ? await createLocalScreenTracks({ audio: includeScreenAudio, video: true })
          : await createLocalTracks({ audio: includeMicrophone, video: true });

      if (sourceMode === "screen" && includeMicrophone) {
        tracks.push(await createLocalAudioTrack());
      }

      for (const track of tracks) {
        await room.localParticipant.publishTrack(track);
      }

      const screenTrack = tracks.find((track) => track.source === Track.Source.ScreenShare);
      if (screenTrack) {
        screenTrack.mediaStreamTrack.addEventListener(
          "ended",
          () => {
            setError("O espelhamento da tela/janela foi encerrado no navegador");
            void disconnect();
          },
          { once: true }
        );
      }

      localTracksRef.current = tracks;
      syncLocalPreview();
      setMuted(false);
      setCameraOff(false);
      setRoomState("connected");
    } catch (err) {
      await disconnect();
      setRoomState("error");
      setError((err as ApiError)?.message ?? "Falha ao iniciar transmissão");
    }
  };

  const toggleMute = async () => {
    const audioTracks = localTracksRef.current.filter((track) => track.kind === Track.Kind.Audio);
    if (audioTracks.length === 0) return;
    const nextMuted = !muted;
    setMuted(nextMuted);
    for (const track of audioTracks) {
      if (nextMuted) await track.mute();
      else await track.unmute();
    }
  };

  const toggleCamera = async () => {
    const videoTracks = localTracksRef.current.filter((track) => track.kind === Track.Kind.Video);
    if (videoTracks.length === 0) return;
    const nextOff = !cameraOff;
    setCameraOff(nextOff);
    for (const track of videoTracks) {
      if (nextOff) await track.mute();
      else await track.unmute();
    }
    syncLocalPreview();
  };

  const hasPublishedAudio = localTracksRef.current.some((track) => track.kind === Track.Kind.Audio);
  const videoControlLabel = sourceMode === "screen" ? (cameraOff ? "Retomar espelhamento" : "Pausar espelhamento") : cameraOff ? "Ligar câmera" : "Desligar câmera";
  const sourceDescription =
    sourceMode === "screen"
      ? "Compartilhe a janela ou a tela onde o software terceirizado espelha o VR."
      : "Use a câmera padrão do computador como fallback.";

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

      <Panel title="Fonte da transmissão">
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="radio" name="sourceMode" checked={sourceMode === "screen"} onChange={() => setSourceMode("screen")} disabled={roomState === "connected" || roomState === "connecting"} />
              Espelhamento de tela/janela do VR
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="radio" name="sourceMode" checked={sourceMode === "camera"} onChange={() => setSourceMode("camera")} disabled={roomState === "connected" || roomState === "connecting"} />
              Câmera do computador
            </label>
          </div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>{sourceDescription}</div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={includeMicrophone} onChange={(e) => setIncludeMicrophone(e.target.checked)} disabled={roomState === "connected" || roomState === "connecting"} />
              Incluir microfone
            </label>
            {sourceMode === "screen" ? (
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={includeScreenAudio} onChange={(e) => setIncludeScreenAudio(e.target.checked)} disabled={roomState === "connected" || roomState === "connecting"} />
                Incluir áudio da tela/janela
              </label>
            ) : null}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => void connect()}
              disabled={roomState === "connecting" || roomState === "connected"}
              style={{
                border: "1px solid rgba(219,230,255,0.2)",
                background: "rgba(219,230,255,0.12)",
                color: "#dbe6ff",
                padding: "10px 12px",
                borderRadius: 12,
                cursor: roomState === "connecting" || roomState === "connected" ? "not-allowed" : "pointer",
                fontWeight: 600
              }}
            >
              {sourceMode === "screen" ? "Iniciar espelhamento" : "Iniciar transmissão"}
            </button>
            <button
              onClick={() => void disconnect()}
              disabled={roomState !== "connected" && roomState !== "error"}
              style={{
                border: "1px solid rgba(219,230,255,0.2)",
                background: "rgba(219,230,255,0.08)",
                color: "#dbe6ff",
                padding: "10px 12px",
                borderRadius: 12,
                cursor: roomState !== "connected" && roomState !== "error" ? "not-allowed" : "pointer"
              }}
            >
              Encerrar
            </button>
          </div>
        </div>
      </Panel>

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
              disabled={roomState !== "connected" || !hasPublishedAudio}
              style={{
                border: "1px solid rgba(219,230,255,0.2)",
                background: "rgba(219,230,255,0.08)",
                color: "#dbe6ff",
                padding: "10px 12px",
                borderRadius: 12,
                cursor: roomState !== "connected" || !hasPublishedAudio ? "not-allowed" : "pointer"
              }}
            >
              {muted ? "Ativar áudio" : "Mutar áudio"}
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
              {videoControlLabel}
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
