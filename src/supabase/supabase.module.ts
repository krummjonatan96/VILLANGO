import { Global, Module } from '@nestjs/common';
import { DriverLocationsController } from './driver-locations.controller.js';
import { DriverLocationsService } from './driver-locations.service.js';
import { SupabaseService } from './supabase.service.js';

@Global()
@Module({
  controllers: [DriverLocationsController],
  providers: [SupabaseService, DriverLocationsService],
  exports: [SupabaseService, DriverLocationsService],
})
export class SupabaseModule {}
