# Neuroverso (MVP)

## Rodar local (Entregável 1 + Entregável 2)

### Pré-requisitos
- Node.js (compatível com o projeto)
- Docker Desktop (engine ativo) para Postgres/Redis

### 1) Subir Postgres + Redis

```bash
docker compose up -d
```

### 2) Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz copiando de `.env.example`.

#### Usando Postgres remoto (Supabase)

- No Supabase, pegue a connection string do banco (Project Settings → Database → Connection string).
- Coloque a URL em `DATABASE_URL` (e inclua `sslmode=require`).
- Se você usar pooler/pgbouncer, coloque a URL do pooler em `DATABASE_URL` e a URL direta em `DIRECT_URL` (para migrations).

Se você for usar o viewer WebRTC (LiveKit), preencha:
- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

### 3) Criar tabelas (Prisma)

```bash
npm -w @neuroverso/backend run prisma:migrate
```

### 4) Rodar backend + frontend

```bash
npm install
npm run dev
```

Frontend: `http://localhost:5173`

Backend: `http://localhost:4000/health`

### 5) Bootstrap do primeiro admin

Na tela de login, use o botão **Bootstrap admin** para criar o primeiro usuário admin (só funciona quando não existe nenhum usuário no banco).

## Viewer (LiveKit) + Shorts + PDF

- No detalhe da sessão, use:
  - **Gerar link do viewer** (link expirável)
  - **Gerar relatório (PDF)** (gera e salva em `STORAGE_DIR`)
- O viewer fica em `http://localhost:5173/viewer/<token>`
