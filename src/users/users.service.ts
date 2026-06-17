import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

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
