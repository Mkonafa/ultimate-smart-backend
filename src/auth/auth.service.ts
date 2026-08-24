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

  async validateUser(identifier: string, pass: string, tenantCode?: string, deviceId?: string): Promise<any> {
    let user: User | null = null;

    // Search globally by Admin Code, Teacher Code, Student Code, Parent Code, National ID, Email, Phone first
    user = await this.usersService.findByIdentifierGlobal(identifier);

    if (!user && tenantCode) {
      const tenant = await this.tenantsService.findByCode(tenantCode);
      if (tenant) {
        user = await this.usersService.findByIdentifierAndTenant(identifier, tenant.id);
      }
    }

    if (!user) {
      const superAdmin = await this.usersService.findSuperAdminByIdentifier(identifier);
      if (superAdmin && superAdmin.password && await bcrypt.compare(pass, superAdmin.password)) {
        const { password, ...result } = superAdmin;
        (result as any).loggedInAs = UserRole.SUPER_ADMIN;
        return result;
      }
      return null;
    }

    if (user && user.password && await bcrypt.compare(pass, user.password)) {
      
      // --- Account Active Check ---
      if (user.isActive === false) {
        throw new UnauthorizedException('تم إيقاف هذا الحساب من قبل الإدارة. يرجى التواصل مع المسؤول.');
      }
      // ----------------------------

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
        if (user.role !== UserRole.CENTER_ADMIN && user.role !== UserRole.SUPER_ADMIN && user.tenant.hasDeviceBindingFeature && user.tenant.isDeviceBindingEnabled) {
          const effectiveDeviceId = deviceId || 'web-browser-device-id';
          if (user.deviceId && user.deviceId !== effectiveDeviceId) {
            throw new UnauthorizedException('هذا الحساب مرتبط بجهاز آخر. يرجى مراجعة إدارة السنتر لفك الارتباط.');
          }
          if (!user.deviceId) {
            await this.usersService.updateDeviceId(user.id, effectiveDeviceId);
            user.deviceId = effectiveDeviceId; // Update local instance for subsequent operations
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

  parseEgyptianNationalId(nationalId: string): string | null {
    if (!nationalId || nationalId.length !== 14 || !/^\d{14}$/.test(nationalId)) {
      return null;
    }
    const centuryDigit = parseInt(nationalId[0], 10);
    let birthYear = parseInt(nationalId.substring(1, 3), 10);
    if (centuryDigit === 2) {
      birthYear += 1900;
    } else if (centuryDigit === 3) {
      birthYear += 2000;
    } else {
      return null;
    }
    const birthMonth = nationalId.substring(3, 5);
    const birthDay = nationalId.substring(5, 7);
    return `${birthYear}-${birthMonth}-${birthDay}`;
  }

  generateStudentCode(fullName: string, nationalId: string, phone: string): string {
    const nameParts = fullName ? fullName.trim().split(/\s+/) : [];
    let initials = nameParts
      .map(p => p[0])
      .join('')
      .toUpperCase();
    
    if (!initials) initials = 'ST';
    if (initials.length > 3) {
      initials = initials.substring(0, 3);
    }
    
    const nidPart = nationalId && nationalId.length >= 4 
      ? nationalId.substring(nationalId.length - 4) 
      : '0000';
    
    const phonePart = phone && phone.length >= 4 
      ? phone.substring(phone.length - 4) 
      : '0000';
      
    return `${initials}-${nidPart}-${phonePart}`;
  }

  async register(userData: any) {
    if (userData.email) {
      const existingUser = userData.tenantId
        ? await this.usersService.findByEmailAndTenant(userData.email, userData.tenantId)
        : await this.usersService.findByEmail(userData.email);
      if (existingUser) {
        throw new BadRequestException('هذا البريد الإلكتروني مستخدم بالفعل. يرجى استخدام بريد إلكتروني آخر أو تسجيل الدخول.');
      }
    }
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    // Generate codes if student
    let generatedCode: string | null = null;
    let generatedParentCode: string | null = null;
    let extractedBirthDate: string | null = null;
    
    if (userData.role === UserRole.STUDENT || !userData.role) {
      const nationalId = userData.nationalId || '';
      const phone = userData.phone || userData.parentPhone || '';
      const fullName = userData.fullName || '';
      
      generatedCode = this.generateStudentCode(fullName, nationalId, phone);
      generatedParentCode = 'P' + Math.floor(10000 + Math.random() * 90000).toString(); // P + 5 digit code
      extractedBirthDate = this.parseEgyptianNationalId(nationalId);
    }

    const newUser = await this.usersService.create({
      ...userData,
      password: hashedPassword,
      studentCode: generatedCode,
      parentCode: generatedParentCode,
      birthDate: extractedBirthDate,
    });
    const { password, ...result } = newUser;
    return result;
  }


}
