import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

// Global BigInt -> JSON stringify guard (avoids "Do not know how to serialize a BigInt")
if (typeof (BigInt.prototype as any).toJSON !== 'function') {
  // eslint-disable-next-line no-extend-native
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Allow dev/frontends (Expo web/exp.direct/expo.dev/localhost). Adjust FRONTEND_URL in prod.
  // Broad CORS for dev/testing (expo web/tunnel). Tighten for production if needed.
  app.enableCors({
    origin: true, // allow all origins (includes *.exp.direct / *.expo.dev)
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization, X-Requested-With',
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('ACE Farmer API')
    .setDescription('API documentation for ACE Farmer backend')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`ACE Farmer backend is running on http://localhost:${port}`);
  // eslint-disable-next-line no-console
  console.log(`Swagger docs available at http://localhost:${port}/docs`);
}

bootstrap();
