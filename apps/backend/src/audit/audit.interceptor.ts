import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { type Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest();

    const method = String(req.method ?? "").toUpperCase();
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return next.handle();

    const actorId = req.user?.sub ? String(req.user.sub) : null;
    const action = `${method} ${req.originalUrl ?? req.url ?? ""}`;
    const ip = req.ip ? String(req.ip) : null;
    const userAgent = req.headers?.["user-agent"] ? String(req.headers["user-agent"]) : null;

    return next.handle().pipe(
      tap({
        next: async () => {
          await this.prisma.auditEvent
            .create({
              data: {
                actorId,
                action,
                ip,
                userAgent
              }
            })
            .catch(() => null);
        }
      })
    );
  }
}

