import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('port');
  const logger = new Logger('Bootstrap');

  if (port == null) {
    logger.error('Port is not defined in the configuration.');
    process.exit(1);
  }

  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(port);
  logger.log(`Application listening on port ${port}`);
  logger.log(`Current NODE_ENV: ${configService.get<string>('environment')}`);
}

bootstrap();
