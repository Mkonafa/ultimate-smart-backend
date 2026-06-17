import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async onModuleInit() {
    const superAdminExists = await this.usersRepository.findOne({ where: { role: UserRole.SUPER_ADMIN } });
    if (!superAdminExists) {
      const hashedPassword = await bcrypt.hash('123456', 10);
      await this.usersRepository.save(this.usersRepository.create({
        email: 'admin@system.com',
        password: hashedPassword,
        role: UserRole.SUPER_ADMIN,
        fullName: 'مدير النظام الأساسي',
      }));
      console.log('✅ Super Admin account created: admin@system.com / 123456');
    }
  }

  async findSuperAdminByIdentifier(identifier: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: [
        { email: identifier, role: UserRole.SUPER_ADMIN },
        { phone: identifier, role: UserRole.SUPER_ADMIN },
        { adminCode: identifier, role: UserRole.SUPER_ADMIN },
      ],
    });
  }

  async findByEmailAndTenant(email: string, tenantId: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email, tenantId } });
  }

  async findByIdentifierAndTenant(identifier: string, tenantId: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: [
        { email: identifier, tenantId },
        { nationalId: identifier, tenantId },
        { adminCode: identifier, tenantId },
        { teacherCode: identifier, tenantId },
        { studentCode: identifier, tenantId },
        { parentCode: identifier, tenantId }
      ],
      relations: { tenant: true },
    });
  }

  async updateDeviceId(userId: string, deviceId: string): Promise<void> {
    await this.usersRepository.update(userId, { deviceId });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(userData);
    return this.usersRepository.save(user);
  }

  async findAllByTenant(tenantId: string): Promise<User[]> {
    return this.usersRepository.find({ where: { tenantId } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
      relations: { tenant: true },
    });
  }

  async findChildrenOfParent(parentId: string): Promise<User[]> {
    return this.usersRepository.find({
      where: { parentId },
      relations: { tenant: true },
    });
  }

  async toggleQr(id: string, tenantId: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id, tenantId } });
    if (!user) throw new Error('User not found');
    user.isQrEnabled = !user.isQrEnabled;
    return this.usersRepository.save(user);
  }

  async updateFcmToken(userId: string, token: string): Promise<void> {
    await this.usersRepository.update(userId, { fcmToken: token });
  }
}
