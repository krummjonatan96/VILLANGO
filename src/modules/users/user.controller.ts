import { Body, Controller, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { CreateUserDto, UpdateUserDto } from './user.dto.js';
import { UserService } from './user.service.js';

@Controller('api/usuarios')
export class UserController {
  constructor(private readonly service: UserService) {}
  @Post() create(@Body() dto: CreateUserDto) { return this.service.create(dto); }
  @Get() findAll() { return this.service.findAll(); }
  @Get(':id') findById(@Param('id', ParseIntPipe) id: number) { return this.service.findById(id); }
  @Put(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) { return this.service.update(id, dto); }
}
