import { Module } from "@nestjs/common";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { EnvModule } from "./config/env.module";
import { PrismaModule } from "./prisma/prisma.module";
import { PrismaExceptionFilter } from "./prisma/prisma-exception.filter";
import { RedisModule } from "./redis/redis.module";
import { MailModule } from "./mail/mail.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { ChildrenModule } from "./children/children.module";
import { RoomsModule } from "./rooms/rooms.module";
import { DevicesModule } from "./devices/devices.module";
import { ProtocolsModule } from "./protocols/protocols.module";
import { AppointmentsModule } from "./appointments/appointments.module";
import { SessionsModule } from "./sessions/sessions.module";
import { AuditInterceptor } from "./audit/audit.interceptor";
import { AppController } from "./app.controller";
import { StreamingModule } from "./streaming/streaming.module";
import { ShortsModule } from "./shorts/shorts.module";
import { ReportsModule } from "./reports/reports.module";

@Module({
  imports: [
    EnvModule,
    PrismaModule,
    RedisModule,
    MailModule,
    AuthModule,
    UsersModule,
    ChildrenModule,
    RoomsModule,
    DevicesModule,
    ProtocolsModule,
    AppointmentsModule,
    SessionsModule,
    StreamingModule,
    ShortsModule,
    ReportsModule
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: PrismaExceptionFilter
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor
    }
  ]
})
export class AppModule {}
