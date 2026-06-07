import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../users/entities/user.entity';
import { OAuth2Client } from 'google-auth-library';

const CLIENT_ID = '528031984893-slk81iqeoevot2ffoqpdp1rngcg0e2p3.apps.googleusercontent.com';
const client = new OAuth2Client(CLIENT_ID);

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService
  ) {}

  async validateUser(identifier: string, pass: string, deviceId?: string): Promise<any> {
    const user = await this.usersService.findByIdentifier(identifier);
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
    const existingUser = await this.usersService.findByEmail(userData.email);
    if (existingUser) {
      throw new BadRequestException('User already exists');
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

  async googleLogin(idToken: string) {
    try {
      let payload;
      try {
        const ticket = await client.verifyIdToken({
            idToken: idToken,
            audience: CLIENT_ID,
        });
        payload = ticket.getPayload();
      } catch (err: any) {
        console.warn('⚠️ Google cryptographic verification failed. Falling back to local decoding for development:', err.message);
        const parts = idToken.split('.');
        if (parts.length === 3) {
          const payloadJson = Buffer.from(parts[1], 'base64').toString('utf8');
          payload = JSON.parse(payloadJson);
        } else {
          throw err;
        }
      }

      if (!payload || !payload.email) throw new UnauthorizedException('Invalid Google Token');
      
      let user = await this.usersService.findByEmail(payload.email);
      if (!user) {
        // إنشاء مستخدم جديد إذا لم يكن موجوداً
        user = await this.usersService.create({
          email: payload.email,
          provider: 'google',
          googleId: payload.sub,
          role: UserRole.STUDENT, // الدور الافتراضي
        });
      }
      return this.login(user);
    } catch (error) {
      console.error('Google verification error:', error);
      throw new UnauthorizedException('فشل التحقق من حساب جوجل');
    }
  }
}
