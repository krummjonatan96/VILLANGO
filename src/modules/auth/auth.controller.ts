import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { RegisterDto, LoginDto } from './auth.dto.js';
import { AuthService } from './auth.service.js';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}
  @Post('register') register(@Body() dto: RegisterDto) { return this.service.register(dto); }
  @Post('login') login(@Body() dto: LoginDto) { return this.service.login(dto); }
  @Post('logout') logout(@Headers('authorization') authorization?: string) { return this.service.logout(authorization); }
  @Get('me') me(@Headers('authorization') authorization?: string) { return this.service.me(authorization); }
}
