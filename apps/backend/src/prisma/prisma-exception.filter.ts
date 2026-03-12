import { Catch, type ExceptionFilter, type ArgumentsHost, HttpStatus } from "@nestjs/common";
import { PrismaClientInitializationError, PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

@Catch(PrismaClientInitializationError, PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: PrismaClientInitializationError | PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();

    const code =
      exception instanceof PrismaClientKnownRequestError ? exception.code : ((exception as any).errorCode as string | undefined);

    const isConnectionError = typeof code === "string" && code.startsWith("P100");
    const isSchemaError = code === "P2021" || code === "P2022";

    const status = isConnectionError ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = isConnectionError
      ? "Banco de dados indisponível. Inicie Postgres/Redis (docker compose up -d) e rode prisma:migrate."
      : isSchemaError
        ? "Banco de dados não inicializado. Rode prisma:migrate."
        : "Falha ao acessar o banco de dados.";

    res.status(status).json({ statusCode: status, message });
  }
}

