import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './config/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ChildrenModule } from './modules/children/children.module';
import { GuardiansModule } from './modules/guardians/guardians.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { ProtocolsModule } from './modules/protocols/protocols.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { ObservationsModule } from './modules/observations/observations.module';
import { ShortsModule } from './modules/shorts/shorts.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SignaturesModule } from './modules/signatures/signatures.module';
import { ConsentsModule } from './modules/consents/consents.module';
import { AuditModule } from './modules/audit/audit.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    ChildrenModule,
    GuardiansModule,
    RoomsModule,
    ProtocolsModule,
    SessionsModule,
    ObservationsModule,
    ShortsModule,
    ReportsModule,
    SignaturesModule,
    ConsentsModule,
    AuditModule,
    NotificationsModule,
    HealthModule,
  ],
})
export class AppModule {}
