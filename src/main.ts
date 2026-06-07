import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as admin from 'firebase-admin';
import * as path from 'path';

async function bootstrap() {
  // Initialize Firebase Admin
  const serviceAccountPath = path.resolve(__dirname, '../../service-account.json');
  try {
    admin.initializeApp({
      credential: admin.credential.cert(require(serviceAccountPath)),
    });
  } catch (e) {
    console.warn('⚠️ Firebase credentials not found (service-account.json). Push Notifications will be disabled on Cloud unless env vars are provided.');
  }

  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
