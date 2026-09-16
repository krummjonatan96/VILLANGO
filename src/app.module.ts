import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './supabase/supabase.module.js';
import { AppController } from './app.controller.js';
import { DatabaseService } from './core/database.service.js';
import { AuthService } from './modules/auth/auth.service.js';
import { AuthController } from './modules/auth/auth.controller.js';
import { AuthRepository } from './modules/auth/auth.repository.js';
import { UserController } from './modules/users/user.controller.js';
import { UserRepository } from './modules/users/user.repository.js';
import { UserService } from './modules/users/user.service.js';
import { LocationController } from './modules/locations/location.controller.js';
import { LocationRepository } from './modules/locations/location.repository.js';
import { LocationService } from './modules/locations/location.service.js';
import { DriverUserController } from './modules/driver-users/driver-user.controller.js';
import { DriverUserRepository } from './modules/driver-users/driver-user.repository.js';
import { DriverUserService } from './modules/driver-users/driver-user.service.js';
import { WeatherController } from './modules/weather/weather.controller.js';
import { WeatherService } from './modules/weather/weather.service.js';
import { SystemController } from './modules/system/system.controller.js';
import { SystemService } from './modules/system/system.service.js';
import {
  CalificacionesController,
  ConductoresController,
  DocumentosController,
  SolicitudesViajeConductorController,
  TiposDocumentoController,
  UbicacionesConductorController,
  UbicacionesViajeController,
  VehiculosController,
  ViajesController,
} from './modules/mobility/mobility.controller.js';
import {
  CalificacionesService,
  ConductoresService,
  DocumentosService,
  SolicitudesViajeConductorService,
  TiposDocumentoService,
  UbicacionesConductorService,
  UbicacionesViajeService,
  VehiculosService,
  ViajesService,
} from './modules/mobility/mobility.service.js';
import { DriverRegistrationService } from './modules/mobility/driver-registration.service.js';
import {
  CalificacionesRepository,
  ConductoresRepository,
  DocumentosRepository,
  SolicitudesViajeConductorRepository,
  TiposDocumentoRepository,
  UbicacionesConductorRepository,
  UbicacionesViajeRepository,
  VehiculosRepository,
  ViajesRepository,
} from './modules/mobility/mobility.repository.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), HttpModule, SupabaseModule],
  controllers: [
    AppController,
    AuthController,
    UserController,
    LocationController,
    DriverUserController,
    WeatherController,
    SystemController,
    ConductoresController,
    VehiculosController,
    TiposDocumentoController,
    DocumentosController,
    UbicacionesConductorController,
    UbicacionesViajeController,
    ViajesController,
    SolicitudesViajeConductorController,
    CalificacionesController,
  ],
  providers: [
    DatabaseService,
    AuthService,
    AuthRepository,
    UserRepository,
    UserService,
    LocationRepository,
    LocationService,
    DriverUserRepository,
    DriverUserService,
    WeatherService,
    SystemService,
    ConductoresRepository,
    VehiculosRepository,
    TiposDocumentoRepository,
    DocumentosRepository,
    UbicacionesConductorRepository,
    UbicacionesViajeRepository,
    ViajesRepository,
    SolicitudesViajeConductorRepository,
    CalificacionesRepository,
    ConductoresService,
    VehiculosService,
    TiposDocumentoService,
    DocumentosService,
    UbicacionesConductorService,
    UbicacionesViajeService,
    ViajesService,
    SolicitudesViajeConductorService,
    CalificacionesService,
    DriverRegistrationService,
  ],
})
export class AppModule {}
