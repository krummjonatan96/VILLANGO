import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../core/database.service.js';

@Injectable()
export class SystemService {
  constructor(private readonly database: DatabaseService) {}
  getDatabaseStatus() { return this.database.getStatus(); }
}
