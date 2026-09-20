import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { RegisterDto, LoginDto } from './auth.dto.js';
import { AuthService } from './auth.service.js';
import { RequestWhatsAppOtpDto, VerifyWhatsAppOtpDto } from './whatsapp-otp.dto.js';
import { WhatsAppOtpService } from './whatsapp-otp.service.js';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly service: AuthService, private readonly whatsappOtps: WhatsAppOtpService) {}
  @Post('register') register(@Body() dto: RegisterDto) { return this.service.register(dto); }
  @Post('login') login(@Body() dto: LoginDto) { return this.service.login(dto); }
  @Post('whatsapp-otp/request') requestWhatsAppOtp(@Body() dto: RequestWhatsAppOtpDto) { return this.whatsappOtps.request(dto.phone); }
  @Post('whatsapp-otp/verify') verifyWhatsAppOtp(@Body() dto: VerifyWhatsAppOtpDto) { return this.whatsappOtps.verify(dto.phone, dto.code); }
  @Post('logout') logout(@Headers('authorization') authorization?: string) { return this.service.logout(authorization); }
  @Get('me') me(@Headers('authorization') authorization?: string) { return this.service.me(authorization); }
}
