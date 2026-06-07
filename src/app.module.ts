import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Tenant } from './tenants/entities/tenant.entity';
import { User } from './users/entities/user.entity';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { SubscriptionPlansModule } from './subscription-plans/subscription-plans.module';
import { ChatModule } from './chat/chat.module';
import { SubjectsModule } from './subjects/subjects.module';
import { CoursesModule } from './courses/courses.module';
import { GroupsModule } from './groups/groups.module';
import { AttendanceModule } from './attendance/attendance.module';
import { ExamsModule } from './exams/exams.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: process.env.DATABASE_URL ? 'postgres' : 'better-sqlite3' as any,
      url: process.env.DATABASE_URL,
      database: process.env.DATABASE_URL ? undefined : 'dev.sqlite',
      autoLoadEntities: true,
      synchronize: true, // مؤقت لبيئة التطوير والتجربة السحابية
      ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
    }),
    TenantsModule,
    UsersModule,
    AuthModule,
    SubscriptionPlansModule,
    GroupsModule,
    CoursesModule,
    AttendanceModule,
    ChatModule,
    SubjectsModule,
    ExamsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
