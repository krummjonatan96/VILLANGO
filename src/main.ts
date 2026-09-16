import { NestFactory } from '@nestjs/core';
import { UnprocessableEntityException, ValidationError, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { join } from 'node:path';
import express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));
  app.enableCors({
    // Flutter para Android/iOS no requiere CORS, pero Flutter Web puede
    // ejecutarse desde otra IP durante desarrollo.
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
  });
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    exceptionFactory: (validationErrors: ValidationError[]) => {
      const errors: Record<string, string[]> = {};
      const collect = (items: ValidationError[], prefix = '') => items.forEach((item) => {
        const field = prefix ? `${prefix}.${item.property}` : item.property;
        if (item.constraints) errors[field] = Object.values(item.constraints);
        if (item.children?.length) collect(item.children, field);
      });
      collect(validationErrors);
      return new UnprocessableEntityException({ message: 'Datos inválidos', errors });
    },
  }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Clima API')
    .setDescription('API básica para registrar ubicaciones y consultar el clima')
    .setVersion('1.0')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  // Escuchar en todas las interfaces permite acceder desde el emulador
  // Android o desde un teléfono conectado a la misma red Wi-Fi.
  await app.listen(Number(process.env.PORT ?? 3000), '0.0.0.0');
}

void bootstrap();
