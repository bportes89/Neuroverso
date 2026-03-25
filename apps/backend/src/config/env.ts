import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z
    .string()
    .default("postgresql://postgres:postgres@localhost:5432/neuroverso?schema=public"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_SECRET: z.string().min(16).default("dev-only-change-me-0123456789"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  LIVEKIT_URL: z.string().default(""),
  LIVEKIT_API_KEY: z.string().default(""),
  LIVEKIT_API_SECRET: z.string().default(""),
  STORAGE_DIR: z.string().default("storage"),
  AUDIT_RETENTION_DAYS: z.coerce.number().int().positive().default(365),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  GOVBR_OAUTH_URL: z.string().default(""),
  GOVBR_TOKEN_URL: z.string().default(""),
  GOVBR_API_BASE: z.string().default(""),
  GOVBR_CLIENT_ID: z.string().default(""),
  GOVBR_CLIENT_SECRET: z.string().default(""),
  GOVBR_REDIRECT_URL: z.string().default("")
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(input: NodeJS.ProcessEnv): Env {
  const parsed = envSchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(message);
  }
  if (parsed.data.NODE_ENV === "production") {
    if (!input.DATABASE_URL || !input.REDIS_URL || !input.JWT_SECRET) {
      throw new Error("DATABASE_URL, REDIS_URL e JWT_SECRET são obrigatórios em produção");
    }
  }
  return parsed.data;
}
