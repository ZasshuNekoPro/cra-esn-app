import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CraModule } from './cra/cra.module';
import { ProjectsModule } from './projects/projects.module';
import { NotificationsModule } from './notifications/notifications.module';
import { StorageModule } from './storage/storage.module';
import { DocumentsModule } from './documents/documents.module';
import { ConsentModule } from './consent/consent.module';
import { ReportsModule } from './reports/reports.module';
import { RagModule } from './rag/rag.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { MissionsModule } from './missions/missions.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [{
        ttl: config.get<number>('RATE_LIMIT_TTL', 60) * 1000,
        limit: config.get<number>('RATE_LIMIT_MAX', 100),
      }],
    }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    AuthModule,
    NotificationsModule,
    CraModule,
    ProjectsModule,
    StorageModule,
    DocumentsModule,
    ConsentModule,
    ReportsModule,
    RagModule,
    HealthModule,
    UsersModule,
    MissionsModule,
  ],
  providers: [
    // Global exception filter
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    // Global guards (applied in order: throttle → JWT → Roles)
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
