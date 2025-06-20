import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Enable CORS for the Angular frontend
  app.enableCors({
    origin: ['http://localhost:4200', 'http://127.0.0.1:4200'], // Angular default dev server URLs
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

  app.use((req: { body: any; }, res: any, next: () => void) => {
    if (req.body) logger.log('Request body exists:', req.body);

    next();
  });
  await app.listen(process.env['PORT'] ?? 3000);
}
void bootstrap();
