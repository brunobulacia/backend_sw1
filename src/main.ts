import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
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

    const port = process.env.PORT ?? 8080;
    console.log(`🚀 Server starting on port ${port}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔑 JWT_SECRET configured: ${!!process.env.JWT_SECRET}`);
    console.log(`🗄️ DATABASE_URL configured: ${!!process.env.DATABASE_URL}`);

    await app.listen(port, '0.0.0.0');
    console.log(`🔥 Application is running on: ${await app.getUrl()}`);
  } catch (error) {
    console.error('💥 Failed to start application:', error);
    process.exit(1);
  }
}
void bootstrap();
