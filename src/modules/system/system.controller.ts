import { Controller, Get } from '@nestjs/common';
import { SystemService } from './system.service.js';

@Controller('api/database')
export class SystemController {
  constructor(private readonly service: SystemService) {}
  @Get('status') getDatabaseStatus() { return this.service.getDatabaseStatus(); }
}
