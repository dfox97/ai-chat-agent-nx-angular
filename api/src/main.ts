import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Enable CORS for the Angular frontend
  app.enableCors({
    origin: ['http://localhost:4200', 'http://127.0.0.1:4200'], // Angular default dev server URLs
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

  app.use((req, res, next) => {
    if (req.body) console.log('Request body exists:', req.body);
    else console.log('No request body found');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    next();
  });
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
