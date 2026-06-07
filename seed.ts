import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Tenant } from './src/tenants/entities/tenant.entity';
import { User, UserRole } from './src/users/entities/user.entity';

const AppDataSource = new DataSource({
  type: 'better-sqlite3',
  database: 'dev.sqlite',
  entities: [Tenant, User],
  synchronize: true,
});

async function runSeed() {
  await AppDataSource.initialize();
  console.log('Database connected.');

  const tenantRepo = AppDataSource.getRepository(Tenant);
  const userRepo = AppDataSource.getRepository(User);

  // Clean old records
  await userRepo.clear();
  await tenantRepo.clear();
  console.log('Cleared existing data.');

  // 1. Create Immortal Super Admin
  const hashedAdminPass = await bcrypt.hash('123456', 10);
  await userRepo.save({
    email: 'elshrooq1975@gmail.com',
    password: hashedAdminPass,
    role: UserRole.SUPER_ADMIN,
    fullName: 'المدير المالك (Immortal)',
    isActive: true,
  });

  // 2. Create Tenant (Center)
  const center = await tenantRepo.save({
    name: 'سنتر النخبة (التجريبي)',
    domain: 'elite-center',
    isActive: true,
    hasDeviceBindingFeature: true, // Super admin gave this permission
    isDeviceBindingEnabled: true,  // Center admin turned it on
  });

  // 3. Create Center Admin
  const hashedCenterAdminPass = await bcrypt.hash('123456', 10);
  await userRepo.save({
    adminCode: 'C-001',
    password: hashedCenterAdminPass,
    role: UserRole.CENTER_ADMIN,
    fullName: 'مدير سنتر النخبة',
    tenantId: center.id,
    isActive: true,
  });

  // 4. Create Teacher
  const hashedTeacherPass = await bcrypt.hash('123456', 10);
  await userRepo.save({
    teacherCode: 'T-001-01',
    password: hashedTeacherPass,
    role: UserRole.TEACHER,
    fullName: 'مستر أحمد (رياضيات)',
    tenantId: center.id,
    isActive: true,
  });

  // 5. Create Student
  const hashedStudentPass = await bcrypt.hash('123456', 10);
  const student = await userRepo.save({
    nationalId: '29001011234567',
    password: hashedStudentPass,
    role: UserRole.STUDENT,
    fullName: 'طالب تجريبي',
    tenantId: center.id,
    isActive: true,
  });

  // 6. Create Parent for Student
  const hashedParentPass = await bcrypt.hash('123456', 10);
  await userRepo.save({
    parentCode: 'P-12345',
    password: hashedParentPass,
    role: UserRole.PARENT,
    fullName: 'ولي أمر الطالب التجريبي',
    parentId: student.id,
    tenantId: center.id,
    isActive: true,
  });

  console.log('Seed completed successfully!');
  console.log('----------------------------');
  console.log('Super Admin: elshrooq1975@gmail.com');
  console.log('Center Admin: C-001');
  console.log('Teacher: T-001-01');
  console.log('Student: 29001011234567');
  console.log('Parent: P-12345');
  console.log('All passwords: 123456');

  await AppDataSource.destroy();
}

runSeed().catch(console.error);
