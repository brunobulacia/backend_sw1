import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Configure CORS
  app.enableCors({
    origin: true, // In production, specify allowed origins
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      stopAtFirstError: true,
      validationError: { target: false, value: false },
    }),
  );

  const port = process.env.PORT ?? 8000;
  console.log(`🚀 Server starting on port ${port}`);

  await app.listen(port, '0.0.0.0');
  console.log(`🔥 Application is running on: ${await app.getUrl()}`);
}
void bootstrap();
