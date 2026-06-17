import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { TenantsService } from '../tenants/tenants.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private tenantsService: TenantsService,
    private jwtService: JwtService
  ) {}

  async validateUser(identifier: string, pass: string, tenantCode: string, deviceId?: string): Promise<any> {
    if (!tenantCode) {
      const superAdmin = await this.usersService.findSuperAdminByIdentifier(identifier);
      if (superAdmin && superAdmin.password && await bcrypt.compare(pass, superAdmin.password)) {
        const { password, ...result } = superAdmin;
        (result as any).loggedInAs = UserRole.SUPER_ADMIN;
        return result;
      }
      throw new BadRequestException('يجب إدخال كود المؤسسة');
    }

    const tenant = await this.tenantsService.findByCode(tenantCode);
    if (!tenant) {
      throw new UnauthorizedException('كود المؤسسة غير صحيح');
    }

    const user = await this.usersService.findByIdentifierAndTenant(identifier, tenant.id);
    if (user && user.password && await bcrypt.compare(pass, user.password)) {
      
      // --- SaaS Subscription Check ---
      if (user.role !== UserRole.SUPER_ADMIN && user.tenant) {
        if (!user.tenant.isActive) {
          throw new UnauthorizedException(user.tenant.adminSuspensionReason || 'تم إيقاف هذا الكيان من قبل الإدارة.');
        }
        if (user.tenant.subscriptionEndDate) {
          const now = new Date();
          const endDate = new Date(user.tenant.subscriptionEndDate);
          if (now > endDate) {
            throw new UnauthorizedException('انتهى اشتراك هذه المنشأة التعليمية، يرجى مراجعة إدارة السنتر للتجديد.');
          }
        }
        
        // --- Device Binding Check (ربط الجهاز) ---
        if (user.tenant.hasDeviceBindingFeature && user.tenant.isDeviceBindingEnabled) {
          if (!deviceId) {
            throw new UnauthorizedException('يجب توفير معرف الجهاز للتحقق من الأمان.');
          }
          if (user.deviceId && user.deviceId !== deviceId) {
            throw new UnauthorizedException('هذا الحساب مرتبط بجهاز آخر. يرجى مراجعة إدارة السنتر لفك الارتباط.');
          }
          if (!user.deviceId) {
            await this.usersService.updateDeviceId(user.id, deviceId);
            user.deviceId = deviceId; // Update local instance for subsequent operations
          }
        }
        // ------------------------------------------
      }
      // -------------------------------

      const { password, ...result } = user;
      
      // Check if they logged in with parent code
      if (identifier === user.parentCode && identifier !== user.studentCode && identifier !== user.nationalId) {
        (result as any).loggedInAs = UserRole.PARENT;
      } else {
        (result as any).loggedInAs = user.role;
      }
      
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { 
      email: user.email, 
      sub: user.id, 
      role: user.loggedInAs || user.role, 
      tenantId: user.tenantId || user.tenant?.id 
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(userData: any) {
    if (userData.email && userData.tenantId) {
      const existingUser = await this.usersService.findByEmailAndTenant(userData.email, userData.tenantId);
      if (existingUser) {
        throw new BadRequestException('User already exists in this institution');
      }
    }
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    // Generate codes if student
    let generatedCode: string | null = null;
    let generatedParentCode: string | null = null;
    if (userData.role === UserRole.STUDENT || !userData.role) {
      generatedCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit code
      generatedParentCode = 'P' + Math.floor(10000 + Math.random() * 90000).toString(); // P + 5 digit code
    }

    const newUser = await this.usersService.create({
      ...userData,
      password: hashedPassword,
      studentCode: generatedCode,
      parentCode: generatedParentCode,
    });
    const { password, ...result } = newUser;
    return result;
  }


}
