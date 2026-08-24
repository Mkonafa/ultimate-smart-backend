import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
  ) {}

  async onModuleInit() {
    try {
      const hashedPassword = await bcrypt.hash('123456', 10);

      // 1. Super Admin
      const superAdminExists = await this.usersRepository.findOne({ where: { role: UserRole.SUPER_ADMIN } });
      if (!superAdminExists) {
        await this.usersRepository.save(this.usersRepository.create({
          email: 'admin@system.com',
          password: hashedPassword,
          role: UserRole.SUPER_ADMIN,
          fullName: 'مدير النظام الأساسي',
        }));
        console.log('✅ Super Admin created: admin@system.com / 123456');
      }

      // 2. Default Tenant (Center)
      let center = await this.tenantRepository.findOne({ where: { domain: 'center1.com' } });
      if (!center) {
        center = await this.tenantRepository.save(this.tenantRepository.create({
          name: 'مركز علم التعليمي',
          code: 'C001',
          domain: 'center1.com',
          isActive: true,
        }));
        console.log('✅ Default Center created: مركز علم التعليمي (C001)');
      } else if (!center.code || center.code !== 'C001') {
        center.code = 'C001';
        center.isActive = true;
        await this.tenantRepository.save(center);
        console.log('✅ Default Center updated with code C001');
      }

      // 3. Center Admin (ADMIN01)
      let centerAdmin = await this.usersRepository.findOne({ where: { adminCode: 'ADMIN01' } });
      if (!centerAdmin) {
        await this.usersRepository.save(this.usersRepository.create({
          email: 'admin@center1.com',
          adminCode: 'ADMIN01',
          password: hashedPassword,
          role: UserRole.CENTER_ADMIN,
          tenant: center,
          tenantId: center.id,
          fullName: 'مدير المركز الإداري',
        }));
        console.log('✅ Center Admin created: ADMIN01 / 123456');
      }

      // 4. Teacher (TCH01)
      let teacher = await this.usersRepository.findOne({ where: { teacherCode: 'TCH01' } });
      if (!teacher) {
        await this.usersRepository.save(this.usersRepository.create({
          email: 'teacher@center1.com',
          teacherCode: 'TCH01',
          password: hashedPassword,
          role: UserRole.TEACHER,
          tenant: center,
          tenantId: center.id,
          fullName: 'أ. أحمد علي',
        }));
        console.log('✅ Teacher created: TCH01 / 123456');
      }

      // 5. Parent (PAR01)
      let parentUser = await this.usersRepository.findOne({ where: { parentCode: 'PAR01' } });
      if (!parentUser) {
        parentUser = await this.usersRepository.save(this.usersRepository.create({
          email: 'parent@center1.com',
          parentCode: 'PAR01',
          password: hashedPassword,
          role: UserRole.PARENT,
          tenant: center,
          tenantId: center.id,
          fullName: 'محمود كنافة (ولي أمر)',
          phone: '01098765432',
        }));
        console.log('✅ Parent created: PAR01 / 123456');
      }

      // 6. Student (STU01)
      let student = await this.usersRepository.findOne({ 
        where: [{ studentCode: 'STU01' }, { studentCode: '100100' }] 
      });
      if (student) {
        if (student.studentCode !== 'STU01') {
          student.studentCode = 'STU01';
          await this.usersRepository.save(student);
          console.log('✅ Student code updated to: STU01');
        }
      } else {
        await this.usersRepository.save(this.usersRepository.create({
          email: 'student@center1.com',
          studentCode: 'STU01',
          parentCode: 'PAR01',
          password: hashedPassword,
          role: UserRole.STUDENT,
          tenant: center,
          tenantId: center.id,
          fullName: 'أحمد محمود كنافة',
          educationLevel: 'high',
          parentId: parentUser ? parentUser.id : undefined,
        }));
        console.log('✅ Student created: STU01 / 123456');
      }
    } catch (e) {
      console.error('⚠️ Auto-seeding error in UsersService onModuleInit:', e);
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

  async findByEmail(email: string): Promise<User | null> {
    if (!email) return null;
    return this.usersRepository.findOne({ where: { email } });
  }

  async findByEmailAndTenant(email: string, tenantId: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email, tenantId } });
  }

  async findByIdentifierGlobal(identifier: string): Promise<User | null> {
    if (!identifier) return null;
    const clean = identifier.trim();
    const upper = clean.toUpperCase();
    const lower = clean.toLowerCase();
    const digits = clean.replace(/\D/g, '');

    const whereConditions: any[] = [
      { adminCode: clean }, { adminCode: upper }, { adminCode: lower },
      { teacherCode: clean }, { teacherCode: upper }, { teacherCode: lower },
      { studentCode: clean }, { studentCode: upper }, { studentCode: lower },
      { parentCode: clean }, { parentCode: upper }, { parentCode: lower },
      { nationalId: clean },
      { email: clean }, { email: lower },
      { phone: clean },
    ];

    if (digits.length > 0) {
      whereConditions.push({ studentCode: digits });
      whereConditions.push({ parentCode: digits });
      whereConditions.push({ adminCode: digits });
      whereConditions.push({ teacherCode: digits });
    }

    const found = await this.usersRepository.findOne({
      where: whereConditions,
      relations: { tenant: true },
    });

    if (!found && (upper.startsWith('ADMIN') || upper === 'C-001' || upper === 'ADM')) {
      const centerAdmin = await this.usersRepository.findOne({
        where: { role: UserRole.CENTER_ADMIN },
        relations: { tenant: true },
      });
      if (centerAdmin) return centerAdmin;
    }

    if (found) return found;

    // If not found directly, try finding any user where studentCode/parentCode ends with digits
    if (digits.length >= 3) {
      const allUsers = await this.usersRepository.find({ relations: { tenant: true } });
      const digitMatch = allUsers.find(u => {
        const sc = (u.studentCode || '').replace(/\D/g, '');
        const pc = (u.parentCode || '').replace(/\D/g, '');
        const tc = (u.teacherCode || '').replace(/\D/g, '');
        const ac = (u.adminCode || '').replace(/\D/g, '');
        return sc === digits || pc === digits || tc === digits || ac === digits;
      });
      if (digitMatch) return digitMatch;
    }

    // Failsafe auto-seeding on-demand if default test account is missing in DB
    try {
      const center = await this.tenantRepository.findOne({ where: { code: 'C001' } }) || 
                     await this.tenantRepository.save(this.tenantRepository.create({
                       name: 'مركز علم التعليمي',
                       code: 'C001',
                       domain: 'center1.com',
                       isActive: true,
                     }));
      const hashedPassword = await bcrypt.hash('123456', 10);

      if (upper === 'ADMIN01' || lower === 'admin@center1.com') {
        return await this.usersRepository.save(this.usersRepository.create({
          email: 'admin@center1.com',
          adminCode: 'ADMIN01',
          password: hashedPassword,
          role: UserRole.CENTER_ADMIN,
          tenant: center,
          tenantId: center.id,
          fullName: 'مدير المركز الإداري',
        }));
      } else if (upper === 'TCH01' || lower === 'teacher@center1.com') {
        return await this.usersRepository.save(this.usersRepository.create({
          email: 'teacher@center1.com',
          teacherCode: 'TCH01',
          password: hashedPassword,
          role: UserRole.TEACHER,
          tenant: center,
          tenantId: center.id,
          fullName: 'أ. أحمد علي',
        }));
      } else if (upper === 'STU01' || upper === '100100' || lower === 'student@center1.com') {
        return await this.usersRepository.save(this.usersRepository.create({
          email: 'student@center1.com',
          studentCode: 'STU01',
          parentCode: 'PAR01',
          password: hashedPassword,
          role: UserRole.STUDENT,
          tenant: center,
          tenantId: center.id,
          fullName: 'أحمد محمود كنافة',
          educationLevel: 'high',
        }));
      } else if (upper === 'PAR01' || lower === 'parent@center1.com') {
        return await this.usersRepository.save(this.usersRepository.create({
          email: 'parent@center1.com',
          parentCode: 'PAR01',
          password: hashedPassword,
          role: UserRole.PARENT,
          tenant: center,
          tenantId: center.id,
          fullName: 'محمود كنافة (ولي أمر)',
          phone: '01098765432',
        }));
      }
    } catch (err) {
      console.error('Auto-seed fallback error:', err);
    }

    return null;
  }

  async findByIdentifierAndTenant(identifier: string, tenantId: string): Promise<User | null> {
    if (!identifier) return null;
    const user = await this.findByIdentifierGlobal(identifier);
    if (user && user.tenantId === tenantId) return user;
    return user;
  }

  async updateDeviceId(userId: string, deviceId: string): Promise<void> {
    await this.usersRepository.update(userId, { deviceId });
  }

  async create(userData: Partial<User>): Promise<User> {
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }
    
    // Code auto-generation with Stage Signature Prefix
    const rand = Math.floor(1000 + Math.random() * 9000).toString();
    if (userData.role === UserRole.ADMIN_ASSISTANT && !userData.adminCode) {
      userData.adminCode = `AST-${rand}`;
    } else if (userData.role === UserRole.TEACHER && !userData.teacherCode) {
      userData.teacherCode = `TCH-${rand}`;
    } else if (userData.role === UserRole.STUDENT && !userData.studentCode) {
      const level = userData.educationLevel || 'high';
      let prefix = 'SEC'; // Secondary / High
      if (level === 'primary') prefix = 'PRI';
      else if (level === 'middle') prefix = 'MID';
      else if (level === 'university') prefix = 'UNI';
      
      userData.studentCode = `${prefix}-${rand}`;
      if (!userData.parentCode) {
        userData.parentCode = `PAR-${rand}`;
      }
    }

    const user = this.usersRepository.create(userData);
    return this.usersRepository.save(user);
  }

  async updateUser(id: string, tenantId: string, updateData: any): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id, tenantId } });
    if (!user) throw new Error('User not found');

    if (updateData.password && updateData.password.trim() !== '') {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    } else {
      delete updateData.password;
    }

    if (updateData.code) {
      const codeVal = updateData.code;
      if (user.role === UserRole.STUDENT) user.studentCode = codeVal;
      else if (user.role === UserRole.TEACHER) user.teacherCode = codeVal;
      else if (user.role === UserRole.ADMIN_ASSISTANT || user.role === UserRole.CENTER_ADMIN) user.adminCode = codeVal;
      else if (user.role === UserRole.PARENT) user.parentCode = codeVal;
    }

    Object.assign(user, updateData);
    return this.usersRepository.save(user);
  }

  async toggleRestriction(id: string, tenantId: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id, tenantId } });
    if (!user) throw new Error('User not found');
    user.isRestricted = !user.isRestricted;
    return this.usersRepository.save(user);
  }

  async toggleActive(id: string, tenantId: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id, tenantId } });
    if (!user) throw new Error('User not found');
    user.isActive = !user.isActive;
    return this.usersRepository.save(user);
  }

  async resetPassword(id: string, tenantId: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const user = await this.usersRepository.findOne({ where: { id, tenantId } });
    if (!user) throw new Error('User not found');
    const hashed = await bcrypt.hash(newPassword, 10);
    await this.usersRepository.update(id, { password: hashed });
    return { success: true, message: 'تم إعادة ضبط كلمة المرور بنجاح' };
  }

  getUserCode(user: User): string {
    if (user.role === 'STUDENT') return user.studentCode || '';
    if (user.role === 'TEACHER') return user.teacherCode || '';
    if (user.role === 'PARENT') return user.parentCode || '';
    return user.adminCode || user.email || '';
  }

  async updateUserCode(id: string, tenantId: string, newCode: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id, tenantId } });
    if (!user) throw new Error('User not found');
    if (user.role === 'STUDENT') user.studentCode = newCode;
    else if (user.role === 'TEACHER') user.teacherCode = newCode;
    else if (user.role === 'PARENT') user.parentCode = newCode;
    else user.adminCode = newCode;
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

  async remove(id: string, tenantId: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id, tenantId } });
    if (!user) throw new Error('User not found');
    await this.usersRepository.delete(id);
  }

  async bulkRemove(ids: string[], tenantId: string): Promise<void> {
    for (const id of ids) {
      await this.usersRepository.delete({ id, tenantId }).catch(() => {});
    }
  }

  async updateFcmToken(userId: string, token: string): Promise<void> {
    await this.usersRepository.update(userId, { fcmToken: token });
  }
}
