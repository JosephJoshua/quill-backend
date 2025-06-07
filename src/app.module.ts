import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration, { validateConfig } from './config/configuration';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore, RedisStore } from 'cache-manager-redis-store';
import { CacheStore } from '@nestjs/common/cache';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { QueueModule } from './queue/queue.module';
import { AiModule } from './ai/ai.module';
import { ContentModule } from './content/content.module';
import { AzureModule } from './azure/azure.module';
import { SrsController } from './srs/srs.controller';
import { SrsModule } from './srs/srs.module';
import { QuizModule } from './quiz/quiz.module';
import { TutorModule } from './tutor/tutor.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',
      validate: validateConfig,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.name'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get<string>('environment') !== 'production',
        ssl:
          configService.get<string>('environment') === 'production'
            ? { rejectUnauthorized: false }
            : false,
        autoLoadEntities: true,
        logging:
          configService.get<string>('environment') === 'development'
            ? ['query', 'error']
            : ['error'],
      }),
      inject: [ConfigService],
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const isTls = configService.get<boolean>('redis.tls_enabled');
        let store: RedisStore | null = null;

        try {
          store = await redisStore({
            socket: {
              host: configService.get<string>('redis.host'),
              port: configService.get<number>('redis.port'),
              tls: isTls,
              connectTimeout: 10_000,
            },
            password: configService.get<string>('redis.password'),
          });

          console.log('Successfully created Redis store for cache.');
        } catch (err) {
          console.error('Failed to create Redis store:', err);
        }

        return {
          store: store ? (store as unknown as CacheStore) : undefined,
          ttl: 60 * 5,
        };
      },
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
          tls: configService.get<boolean>('redis.tls_enabled')
            ? { rejectUnauthorized: false }
            : undefined,
          connectTimeout: 15000,
          enableReadyCheck: false,
          maxRetriesPerRequest: null,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: { count: 1000 },
          removeOnFail: { count: 5000 },
        },
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot({}),
    AzureModule,
    AuthModule,
    UserModule,
    AiModule,
    ContentModule,
    QueueModule,
    SrsModule,
    QuizModule,
    TutorModule,
  ],
  controllers: [AppController, SrsController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
