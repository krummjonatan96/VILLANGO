import { Global, Module } from '@nestjs/common';
import { DriverLocationsController } from './driver-locations.controller.js';
import { DriverLocationsService } from './driver-locations.service.js';
import { SupabaseService } from './supabase.service.js';
import { TripRequestsService } from './trip-requests.service.js';

@Global()
@Module({
  controllers: [DriverLocationsController],
  providers: [SupabaseService, DriverLocationsService, TripRequestsService],
  exports: [SupabaseService, DriverLocationsService, TripRequestsService],
})
export class SupabaseModule {}
