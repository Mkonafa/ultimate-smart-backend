import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { User, UserRole } from '../users/entities/user.entity';

import * as admin from 'firebase-admin';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepo: Repository<Notification>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async sendGlobalNotification(tenantId: string, title: string, body: string): Promise<Notification> {
    const notif = this.notificationRepo.create({
      tenantId,
      title,
      body,
      type: NotificationType.GLOBAL,
    });
    
    const savedNotif = await this.notificationRepo.save(notif);

    // Fetch all active users with FCM tokens in this tenant
    const users = await this.userRepo.find({
      where: { tenantId, isActive: true },
      select: { fcmToken: true }
    });

    const tokens: string[] = users
      .map(u => u.fcmToken)
      .filter((token): token is string => typeof token === 'string' && token.length > 0);

    if (tokens.length > 0) {
      try {
        await admin.messaging().sendEachForMulticast({
          tokens,
          notification: {
            title,
            body,
          },
        });
      } catch (err) {
        console.error('Error sending push notification:', err);
      }
    }

    return savedNotif;
  }

  async sendCourseNotification(tenantId: string, courseId: string, title: string, body: string): Promise<Notification> {
    const notif = this.notificationRepo.create({
      tenantId,
      targetCourseId: courseId,
      title,
      body,
      type: NotificationType.COURSE,
    });
    return this.notificationRepo.save(notif);
  }

  async sendIndividualNotification(tenantId: string, targetUserId: string, title: string, body: string): Promise<Notification> {
    const notif = this.notificationRepo.create({
      tenantId,
      targetUserId,
      title,
      body,
      type: NotificationType.INDIVIDUAL,
    });
    return this.notificationRepo.save(notif);
  }

  async getMyNotifications(tenantId: string, user: any): Promise<Notification[]> {
    // A student/parent should see GLOBAL notifications, COURSE notifications (for courses they're in), and INDIVIDUAL notifications.
    // For simplicity in MVP, we will fetch GLOBAL and INDIVIDUAL. 
    // Course fetching would require a join with user_courses. Let's do a basic query for now.
    
    const query = this.notificationRepo.createQueryBuilder('notification')
      .where('notification.tenantId = :tenantId', { tenantId })
      .andWhere(
        '(notification.type = :global OR (notification.type = :individual AND notification.targetUserId = :userId))',
        { global: NotificationType.GLOBAL, individual: NotificationType.INDIVIDUAL, userId: user.sub || user.userId }
      )
      .orderBy('notification.createdAt', 'DESC');

    return query.getMany();
  }

  async markAsRead(id: string, tenantId: string): Promise<Notification> {
    const notif = await this.notificationRepo.findOne({ where: { id, tenantId } });
    if (!notif) throw new NotFoundException('الإشعار غير موجود');
    notif.isRead = true;
    return this.notificationRepo.save(notif);
  }
}
