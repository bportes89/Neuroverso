# Neuroverso
Neuroverso — Projeto Hórus (MVP)
Neuroverso é o sistema que operacionaliza as Salas Meta estilo Snoezelen do Projeto Hórus, coordenando sessões em VR (Meta Quest 3) para crianças autistas, com acompanhamento profissional ao vivo, relatórios clínicos e assinatura digital gratuita via GOV.BR.

🎯 Objetivo do MVP

Agendar sessões (criança, sala, dispositivo, protocolo, profissional).
Iniciar e transmitir a sessão (viewer web para profissionais).
Registrar observações e marcar momentos-chave (“shorts clínicos” opcionais).
Gerar relatório em PDF ao final da sessão.
Enviar para assinatura digital do profissional pelo GOV.BR (gratuito).
Armazenar com segurança documentos e mídias, com auditoria e LGPD.


🧭 Escopo (v1 – MVP)

Salas & Dispositivos: cadastro de salas Snoezelen e Meta Quest 3.
Agenda: criação, remarcação, cancelamento e lembretes por e-mail.
Sessões: iniciar/encerrar, streaming ao vivo (baixa latência), observações.
Shorts clínicos (opcional): clipes curtos (5–10s) marcados pelo terapeuta.
Relatórios: PDF com dados estruturados + anexos (shorts).
Assinaturas: integração com API de Assinatura GOV.BR (link seguro + retorno).
Segurança/LGPD: consentimentos, trilha de auditoria, armazenamento cifrado.
Sem app nativo no headset no MVP (casting do Quest 3 + WebRTC no browser).


Fora de escopo (v1): prontuário completo, faturamento, múltiplas instituições, app móvel dedicado, analytics avançado.


🏗️ Arquitetura (alto nível)
[Quest 3 Casting] → [Browser Captura] → [WebRTC Server (SFU)] → [Viewer Web Profissional]
                                     ↘  [Marcadores/Shorts] → [Storage Seguro (S3/Blob)]
API Neuroverso (Node.js/.NET) ←→ PostgreSQL/Redis ←→ Jobs (filas)
                          ↘  E-mail (SendGrid/SES)
                          ↘  Assinatura GOV.BR (API, links e webhooks)
                          ↘  PDF Service (ReportLab/docx-to-pdf)
Observabilidade: OpenTelemetry + Logs + Auditoria (DB)

Tecnologia sugerida (MVP)

Back-end: Node.js (NestJS) ou .NET 8 (minimal APIs)
Front-end: React/Next.js (PWA)
Streaming: WebRTC com SFU (LiveKit/mediasoup/Janus) — sem gravação padrão
DB: PostgreSQL; Cache: Redis; Storage: S3/Azure Blob
Mensageria/Jobs: BullMQ/Sidekiq-equivalente/Azure Queue/Cloud Tasks
E-mail: SendGrid/SES
Assinatura: API de Assinaturas GOV.BR
Infra: Docker + (Kubernetes/Apps Service) — ambiente dev, stg, prod separados


🔐 Segurança & LGPD (diretrizes)

Dados sensíveis (saúde, menores): coletar consentimento específico do responsável.
Minimização: sem gravação contínua de vídeo no MVP; apenas shorts quando marcados.
Criptografia: TLS 1.2+ em trânsito; AES-256 at-rest (storage e DB quando aplicável).
Controle de acesso: RBAC + escopo por sessão/criança; sessão do viewer com expiração.
Auditoria: log de ações (quem fez o quê, quando, IP).
Retenção: política definida por tipo de dado (documentos clínicos X anos; logs Y meses).
Privacidade de mídia: preferir shorts sem áudio; se usar áudio, documentar a finalidade.


👤 Papéis (RBAC)

Administrador: gestão do sistema, usuários, integrações.
Coordenador Clínico: protocolos, auditoria, consolida relatórios.
Terapeuta/Profissional: viewer, observações, marca shorts, assina relatórios.
Operador de Sala: inicia/encerra sessão, checklist do dispositivo/sala.
Responsável: pode receber termos e, quando aplicável, visualizar relatório.


🔁 Fluxos principais

Agendamento


Admin/Coordenador cria a sessão (criança, sala, Quest 3, protocolo, profissional).
Envia lembrete por e-mail ao profissional.


Execução + Streaming


Operador inicia casting do Quest 3 → browser captura → envia ao SFU WebRTC.
Profissional acessa viewer autenticado (somente leitura).
Terapeuta registra observações e marca shorts (5–10s) quando necessário.


Relatório


Encerrar sessão → gerar PDF (dados estruturados + links de shorts).
Salvar documento e criar pedido de assinatura.


Assinatura GOV.BR


Neuroverso envia documento para API GOV.BR → gera link seguro.
Profissional assina (conta gov.br prata/ouro).
Webhook atualiza status → documento final é arquivado.

🗃️ Modelo de dados (resumo)
Diagrama ER
USER (profissionais, operadores, admin)
 ├─ id (uuid)
 ├─ name
 ├─ email
 ├─ role  [admin | coordenador | terapeuta | operador]
 └─ active (bool)

CHILD (criança atendida)
 ├─ id (uuid)
 ├─ name
 ├─ birth_date
 ├─ diagnosis
 ├─ consent_streaming (bool)
 └─ consent_shorts (bool)

ROOM (sala Snoezelen)
 ├─ id (uuid)
 ├─ name
 └─ location

DEVICE (equipamento VR – Quest 3)
 ├─ id (uuid)
 ├─ name
 └─ serial_number

PROTOCOL (protocolo terapêutico da sessão)
 ├─ id (uuid)
 ├─ name
 └─ steps (json)

SESSION (sessão VR)
 ├─ id (uuid)
 ├─ child_id
 ├─ room_id
 ├─ device_id
 ├─ protocol_id
 ├─ professional_id      (quem atende)
 ├─ start_at
 ├─ end_at
 └─ status [scheduled | in_progress | completed | canceled]

OBSERVATION (observação do terapeuta)
 ├─ id (uuid)
 ├─ session_id
 ├─ author_id
 ├─ timestamp
 ├─ type [nota | evento | incidente | escala]
 └─ payload (json)

SHORT_CLIP (short clínico – vídeo curto de 5-10s)
 ├─ id (uuid)
 ├─ session_id
 ├─ url (armazenamento seguro)
 ├─ duration_seconds
 ├─ muted (bool)
 ├─ hash
 └─ created_at

DOCUMENT (PDF gerado)
 ├─ id (uuid)
 ├─ session_id
 ├─ doc_type [relatorio]
 ├─ url (arquivo no storage)
 ├─ hash
 └─ created_at

SIGN_REQUEST (assinatura GOV.BR)
 ├─ id (uuid)
 ├─ document_id
 ├─ signer_id (profissional)
 ├─ status [pending | signed | expired | declined]
 ├─ govbr_token (link de assinatura)
 ├─ expires_at
 ├─ signed_at
 └─ signer_ip

AUDIT_LOG (auditoria do sistema)
 ├─ id (uuid)
 ├─ user_id
 ├─ action
 ├─ target
 ├─ timestamp
 └─ ip


Resumo visual da relação entre entidades
USER ────┐
         └───< SESSION >─── CHILD
                │  │  │
                │  │  └── DEVICE
                │  └───── ROOM
                │
                ├──< OBSERVATION >
                ├──< SHORT_CLIP >
                ├──< DOCUMENT >──< SIGN_REQUEST >
                └── PROTOCOL

POST /v1/sessions
Content-Type: application/json

{
  "child_id": "uuid",
  "room_id": "uuid",
  "device_id": "uuid",
  "protocol_id": "uuid",
  "start_at": "2026-02-20T17:00:00-03:00",
  "professionals": ["user-therapist-1"]
}
``
POST /v1/sessions/{id}/start
→ Valida disponibilidade (sala/device), abre sala WebRTC e gera viewer link
GET /v1/sessions/{id}/viewer-link
→ Retorna URL expirada para o profissional assistir
``
POST /v1/sessions/{id}/observations
{
  "type": "note|scale|event|incident",
  "payload": {"text":"atenção sustentada melhorou na cena 2"}
}
POST /v1/sessions/{id}/shorts
{
  "seconds_back": 8,
  "mute_audio": true
}
POST /v1/sessions/{id}/report
→ Gera PDF, cria DOCUMENT e um SIGN_REQUEST (status: pending)
Assinatura (GOV.BR)
POST /v1/sign-requests/{id}/send
{
  "channel": "email",
  "expires_at": "2026-02-27T23:59:59Z"
}
POST /webhooks/govbr
→ Body contém status da assinatura (signed|declined|expired) + metadados
``
Arquivos
GET /v1/documents/{id}
→ Retorna metadados + URL assinada de leitura (tempo limitado)
``
🖥️ Front-end (telas MVP)

Agenda: lista/novo agendamento, conflitos, lembretes.
Sessão/Viewer: player ao vivo, botão “Marcar momento”, campo de observações.
Relatório: formulário estruturado, gerar PDF.
Assinaturas: pendências, histórico, status por sessão.
📦 Instalação & Execução (exemplo com Docker)
# 1) Clone
git clone https://github.com/<org>/neuroverso.git
cd neuroverso

# 2) Variáveis de ambiente (.env)
# - DATABASE_URL
# - REDIS_URL
# - STORAGE_BUCKET / STORAGE_CONNECTION
# - EMAIL_PROVIDER_API_KEY
# - GOVBR_API_BASE / GOVBR_CLIENT_ID / GOVBR_CLIENT_SECRET / GOVBR_CALLBACK
# - WEBRTC_SFU_URL
# - JWT_SECRET

# 3) Suba os serviços
docker compose up -d

# 4) Rodar migrações
docker compose exec api npm run prisma:migrate   # (ou dotnet ef database update)

# 5) Acessar
# API: http://localhost:8080/v1
# Web: http://localhost:3000
``
⚙️ Decisões de Projeto (MVP)

Casting do Quest 3 via navegador + WebRTC (SFU).
Sem gravação contínua; apenas shorts no momento do clique.
Assinatura via GOV.BR (API) para reduzir custos.
Relatório em PDF com hash SHA-256 e trilha de auditoria.
Consentimento obrigatório antes de qualquer mídia.


📈 Roadmap (próximas etapas)

v1.1: múltiplos espectadores, chat privado na sessão, tags de observação.
v1.2: dashboards básicos (presença, duração média, taxa de assinatura).
v1.3: integração WhatsApp para lembretes (opt-in).
v2.0: app leve no Quest (telemetria, marcadores in-headset), protocolos dinâmicos, analytics avançado.


🧪 Testes

Unitários: serviços de agenda, geração de PDF, assinatura.
Integração: webhook GOV.BR, upload/URL assinada, fluxo de sessão.
Segurança: testes de autorização por papel e escopo; checagem de tokens expirados; tentativa de hotlink de mídia.


🤝 Contribuição

Crie uma branch a partir de main: feat/<descricao>
Commits semânticos: feat:, fix:, chore:, docs:
Abra PR com descrição do problema, solução e evidências (prints/logs).
Adicione checklist de segurança se mexer com dados sensíveis ou mídia.


📚 Glossário

Sala Snoezelen: ambiente multissensorial controlado.
Shorts clínicos: clipes curtos (5–10s) da sessão, marcados pelo terapeuta.
SFU: Selective Forwarding Unit (servidor que roteia mídia WebRTC).
GOV.BR (API): serviço gratuito de assinatura digital (conta prata/ouro) com integração por link e webhook.


📞 Contatos

Produto/Operação Clínica: [preencher]
Tech Lead / Arquitetura: [preencher]
Segurança/LGPD: [preencher]


Nota final
Este repositório contém informação sensível de projeto voltado a crianças. Respeite rigorosamente as políticas de privacidade, segurança e LGPD. Em caso de dúvida, não faça upload de dados reais em ambientes de desenvolvimento.
