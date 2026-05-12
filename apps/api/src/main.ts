import './load-dev-env';

import { json, raw, urlencoded } from 'express';

import { AppModule } from './app.module';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { RedisIoAdapter } from './realtime/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  console.log('[bootstrap] NestFactory.create finished');

  // Stripe exige el cuerpo sin parsear para validar firmas webhook.
  app.use('/v1/webhooks/stripe', raw({ type: 'application/json' }));

  /** Fotos en base64 (data URL) desde el cliente; el límite por defecto de Express es demasiado bajo. */
  app.use(json({ limit: '2mb' }));
  app.use(urlencoded({ extended: true, limit: '2mb' }));

  const webOrigins =
    process.env.WEB_ORIGIN?.split(',').map((o) => o.trim()) ?? [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://edifyacademy.co',
      'https://www.edifyacademy.co',
    ];

  app.enableCors({
    origin: webOrigins,
    credentials: true,
  });

  const redisUrl = process.env.REDIS_URL?.trim();
  if (redisUrl) {
    const redisAdapter = new RedisIoAdapter(app);
    try {
      await redisAdapter.connectToRedis(redisUrl);
      app.useWebSocketAdapter(redisAdapter);
      console.log('[bootstrap] Redis Socket.IO adapter enabled');
    } catch (err) {
      if (process.env.NODE_ENV === 'production') {
        throw err;
      }
      console.warn(
        '[bootstrap] Redis no disponible; Socket.IO sin adaptador Redis (solo desarrollo). ' +
          'Si necesitas chat en cluster local, levanta Redis o quita REDIS_URL de .env.*',
        err instanceof Error ? err.message : err,
      );
    }
  }

  app.setGlobalPrefix('v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = Number(process.env.PORT ?? 4000);
  console.log(`[bootstrap] calling app.listen(${port})…`);
  await app.listen(port, '0.0.0.0');
  // Ayuda a saber cuándo ya se puede abrir el navegador (antes de esto verás ERR_CONNECTION_REFUSED).
  console.log(`API listening on http://127.0.0.1:${port}/v1/health`);
}

bootstrap().catch((err) => {
  console.error('[bootstrap] failed:', err);
  process.exit(1);
});
