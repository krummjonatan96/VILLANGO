import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import {
  ChangeDriverAvailabilityDto,
  ChangeDriverUserStatusDto,
  CreateDriverUserDto,
  UpdateDriverUserDto,
} from './driver-user.dto.js';
import { DriverUserService } from './driver-user.service.js';

@Controller('api/uauarios-chofer')
export class DriverUserController {
  constructor(private readonly service: DriverUserService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Post()
  create(@Body() dto: CreateDriverUserDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDriverUserDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/estado')
  changeStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: ChangeDriverUserStatusDto) {
    return this.service.changeStatus(id, dto);
  }

  @Patch(':id/disponibilidad')
  changeAvailability(@Param('id', ParseIntPipe) id: number, @Body() dto: ChangeDriverAvailabilityDto) {
    return this.service.changeAvailability(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
