import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import type { Request, Response, NextFunction } from 'express';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Chrome 94+ Private Network Access: browser blocks public-origin → private-IP
  // requests unless the server explicitly opts in via this header in the preflight.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.headers['access-control-request-private-network']) {
      res.setHeader('Access-Control-Allow-Private-Network', 'true');
    }
    next();
  });

  // Parse CORS_ORIGIN as comma-separated list to support multiple origins
  const corsOriginEnv = process.env['CORS_ORIGIN'] ?? 'http://localhost:3000';
  const corsOrigins = corsOriginEnv.split(',').map((o) => o.trim()).filter(Boolean);
  app.enableCors({
    origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
    credentials: true,
  });

  const port = process.env['BACKEND_PORT'] ?? 3001;
  await app.listen(port);
}

void bootstrap();
