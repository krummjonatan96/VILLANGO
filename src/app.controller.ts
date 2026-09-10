import { Body, Controller, Get, Headers, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { AppService } from './app.service.js';
import { CreateLocationDto } from './create-location.dto.js';
import { DatabaseService } from './database.service.js';
import { CreateUserDto, UpdateUserDto } from './user.dto.js';
import { AuthService } from './auth.service.js';
import { RegisterDto, LoginDto } from './auth.dto.js';

@Controller('api')
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly databaseService: DatabaseService,
    private readonly authService: AuthService,
  ) {}

  @Post('auth/register') register(@Body() dto: RegisterDto) { return this.authService.register(dto); }
  @Post('auth/login') login(@Body() dto: LoginDto) { return this.authService.login(dto); }
  @Post('auth/logout') logout(@Headers('authorization') authorization?: string) { return this.authService.logout(authorization); }
  @Get('auth/me') me(@Headers('authorization') authorization?: string) { return this.authService.me(authorization); }

  @Get()
  getInfo() {
    return {
      name: 'clima-api',
      endpoints: [
        'GET /api/locations',
        'POST /api/locations',
        'GET /api/weather',
        'GET /api/database/status',
        'POST /api/usuarios',
        'GET /api/usuarios',
        'GET /api/usuarios/:id',
        'PUT /api/usuarios/:id',
      ],
    };
  }

  @Get('locations')
  getLocations() {
    return this.appService.getLocations();
  }

  @Post('locations')
  createLocation(@Body() location: CreateLocationDto) {
    return this.appService.createLocation(location);
  }

  @Get('weather')
  getWeather(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
  ) {
    return this.appService.getWeather(Number(latitude), Number(longitude));
  }

  @Get('database/status')
  getDatabaseStatus() {
    return this.databaseService.getStatus();
  }

  @Post('usuarios')
  createUser(@Body() user: CreateUserDto) {
    return this.databaseService.createUser(user);
  }

  @Get('usuarios')
  getUsers() {
    return this.databaseService.getUsers();
  }

  @Get('usuarios/:id')
  getUserById(@Param('id', ParseIntPipe) id: number) {
    return this.databaseService.getUserById(id);
  }

  @Put('usuarios/:id')
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() user: UpdateUserDto,
  ) {
    return this.databaseService.updateUser(id, user);
  }
}
