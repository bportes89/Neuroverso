import { Link } from "react-router-dom";

function Card(props: { title: string; description: string; to: string }) {
  return (
    <Link
      to={props.to}
      style={{
        display: "block",
        padding: 16,
        borderRadius: 16,
        border: "1px solid rgba(219,230,255,0.16)",
        background: "rgba(219,230,255,0.06)",
        textDecoration: "none",
        color: "#dbe6ff"
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 16 }}>{props.title}</div>
      <div style={{ opacity: 0.85, marginTop: 6 }}>{props.description}</div>
    </Link>
  );
}

export function EnvironmentPage() {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 8 }}>
        <h2 style={{ margin: 0 }}>Ambiente Virtual</h2>
        <div style={{ opacity: 0.85 }}>
          Selecione uma área para navegar e interagir com os elementos do sistema.
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 12
        }}
      >
        <Card title="Agendamentos" description="Crie tarefas e execute com streaming em tempo real." to="/jobs" />
        <Card title="Relatórios" description="Gere resumos por job e janela de tempo." to="/reports" />
        <Card title="Assinaturas GOV.BR" description="Fluxo stub para assinatura digital e auditoria." to="/signatures" />
      </div>

      <div
        style={{
          height: 260,
          borderRadius: 18,
          border: "1px solid rgba(219,230,255,0.16)",
          background:
            "radial-gradient(520px 240px at 30% 40%, rgba(219,230,255,0.24), rgba(219,230,255,0.04) 60%, rgba(0,0,0,0.06) 100%)",
          display: "grid",
          placeItems: "center",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 700 }}>
          <div style={{ fontWeight: 700, fontSize: 18 }}>Neuroverso</div>
          <div style={{ opacity: 0.85, marginTop: 8 }}>
            Execução contínua, agendamento eficiente, streaming de eventos, relatórios e assinatura com trilha de
            auditoria.
          </div>
        </div>
      </div>
    </div>
  );
}

