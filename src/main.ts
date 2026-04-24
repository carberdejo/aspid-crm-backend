import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { TransformResponseInterceptor } from './common/interceptor/transform-response.interceptor';
import { AppLoggerService } from './common/logging/logger.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filters';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const globalPrefix = 'api/v1';
  app.setGlobalPrefix(globalPrefix);

  const loggerService = app.get(AppLoggerService);
  loggerService.setContext('Bootstrap'); //establecer contexto para el logger

  app.useGlobalFilters(new HttpExceptionFilter(loggerService));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalInterceptors(new TransformResponseInterceptor());

  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('CONCAR ACME API')
    .setDescription(
      'API del sistema CONCAR ACME para gestión de clientes, usuarios y visitas',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Ingrese su token JWT',
        in: 'header',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  app.enableCors({
    origin: process.env.FRONTEND_HOST, // Tu URL de Next.js
    // origin: '*', // Permitir todas las fuentes (ajusta esto para producción)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // Permitir cookies/headers de sesión si fuera necesario
  });

  const port = process.env.PORT ?? 5000;
  await app.listen(port);

  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
  Logger.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`);
}

// Manejar promesas correctamente para evitar floating promises
bootstrap().catch((error) => {
  Logger.error('Error starting the application', error);
  process.exit(1);
});
