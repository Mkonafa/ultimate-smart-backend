import { Controller, Post, Body, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: any) {
    console.log('[AuthController] 🔑 Login request received:', loginDto.identifier);
    try {
      const user = await this.authService.validateUser(loginDto.identifier, loginDto.password, loginDto.deviceId);
      console.log('[AuthController] 👤 User validation result:', user ? `Success` : 'Failed');
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }
      const tokenResult = await this.authService.login(user);
      console.log('[AuthController] 🎟️ Token generated successfully');
      return tokenResult;
    } catch (err: any) {
      console.error('[AuthController] ❌ Login error:', err.message || err);
      throw err;
    }
  }

  @Post('google')
  async googleLogin(@Body('idToken') idToken: string) {
    console.log('[AuthController] 🌐 Google login request received');
    try {
      const result = await this.authService.googleLogin(idToken);
      console.log('[AuthController] ✅ Google login succeeded');
      return result;
    } catch (err: any) {
      console.error('[AuthController] ❌ Google login error:', err.message || err);
      throw err;
    }
  }

  @Post('register')
  async register(@Body() registerDto: any) {
    console.log('[AuthController] 📝 Registration request received:', registerDto.email);
    try {
      const result = await this.authService.register(registerDto);
      console.log('[AuthController] ✅ Registration succeeded');
      return result;
    } catch (err: any) {
      console.error('[AuthController] ❌ Registration error:', err.message || err);
      throw err;
    }
  }
}
