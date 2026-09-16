import { Body, Controller, Delete, Get, Headers, NotFoundException, Param, ParseIntPipe, Patch, Post, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import {
  CreateCalificacionDto, CreateConductorDto, CreateDocumentoDto, CreateSolicitudViajeConductorDto, CreateTipoDocumentoDto,
  CreateUbicacionConductorDto, CreateUbicacionViajeDto, CreateVehiculoDto, CreateViajeDto,
  UpdateCalificacionDto, UpdateConductorDto, UpdateDriverProfileDto, UpdateDocumentoDto, UpdateSolicitudViajeConductorDto, UpdateTipoDocumentoDto,
  RegisterConductorWithVehicleDto, UpdateDriverLocationDto, UpdateUbicacionConductorDto, UpdateUbicacionViajeDto, UpdateVehiculoDto, UpdateViajeDto,
} from './mobility.dto.js';
import {
  CalificacionesService, ConductoresService, DocumentosService, SolicitudesViajeConductorService,
  TiposDocumentoService, UbicacionesConductorService, UbicacionesViajeService, VehiculosService, ViajesService,
} from './mobility.service.js';
import { RegisterDto } from '../auth/auth.dto.js';
import { AuthService } from '../auth/auth.service.js';
import { DriverRegistrationService } from './driver-registration.service.js';

@Controller('api/conductores')
export class ConductoresController {
  constructor(
    private readonly service: ConductoresService,
    private readonly authService: AuthService,
    private readonly registrationService: DriverRegistrationService,
  ) {}
  @Get()
  async findAll(@Headers('authorization') authorization: string | undefined) {
    await this.authService.requireAdministrator(authorization);
    return this.registrationService.listProfiles();
  }
  @Get('mi-perfil')
  async myProfile(@Headers('authorization') authorization: string | undefined) {
    const driver = await this.authService.requireConductor(authorization);
    const profile = await this.registrationService.findProfileByCellphone(String(driver.celular));
    if (!profile) throw new NotFoundException('No existe un perfil de conductor para este usuario.');
    return { data: profile };
  }
  @Get('cercanos')
  async nearby(@Headers('authorization') authorization: string | undefined) {
    await this.authService.requireAdministrator(authorization);
    return this.registrationService.nearbyDrivers();
  }
  @Post('ubicacion')
  async updateLocation(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: UpdateDriverLocationDto,
  ) {
    const driver = await this.authService.requireConductor(authorization);
    const location = await this.registrationService.updateLocation(String(driver.celular), dto.latitud, dto.longitud);
    if (!location) throw new NotFoundException('No existe un perfil de conductor para este usuario.');
    return location;
  }
  @Post('disponibilidad')
  async availability(@Headers('authorization') authorization: string | undefined, @Body() body: { online?: boolean }) {
    const driver = await this.authService.requireConductor(authorization);
    return this.registrationService.setAvailability(String(driver.celular), body.online === true);
  }
  @Get('solicitudes')
  async pendingRequests(@Headers('authorization') authorization: string | undefined) {
    const driver = await this.authService.requireConductor(authorization);
    return { data: await this.registrationService.pendingTripRequests(String(driver.celular)) };
  }
  @Post('solicitudes/:id/aceptar')
  async acceptRequest(@Headers('authorization') authorization: string | undefined, @Param('id', ParseIntPipe) id: number) {
    const driver = await this.authService.requireConductor(authorization);
    return this.registrationService.acceptTripRequest(id, String(driver.celular));
  }
  @Post('solicitudes')
  createRequest(@Body() body: any) { return this.registrationService.createTripRequest(body); }
  @Get(':id')
  async findOne(@Headers('authorization') authorization: string | undefined, @Param('id', ParseIntPipe) id: number) {
    await this.authService.requireAdministrator(authorization);
    const profile = await this.registrationService.findProfileById(id);
    if (!profile) throw new NotFoundException('No existe el conductor.');
    return profile;
  }
  @Post('registro') register(@Body() dto: RegisterDto) { return this.authService.register(dto); }
  @Post('foto')
  @UseInterceptors(FileInterceptor('foto', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadPhoto(
    @Headers('authorization') authorization: string | undefined,
    @UploadedFile() file?: { buffer: Buffer; mimetype: string; originalname: string },
  ) {
    await this.authService.requireAdministrator(authorization);
    if (!file) throw new BadRequestException('Selecciona una foto para subir.');
    const extensionByMime: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
    const extension = extensionByMime[file.mimetype] ?? extname(file.originalname).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(extension)) throw new BadRequestException('La foto debe ser JPG, PNG o WEBP.');
    const folder = join(process.cwd(), 'uploads', 'conductores');
    await mkdir(folder, { recursive: true });
    const filename = `${randomUUID()}${extension === '.jpeg' ? '.jpg' : extension}`;
    await writeFile(join(folder, filename), file.buffer);
    return { url: `/uploads/conductores/${filename}` };
  }
  @Post()
  async create(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: RegisterConductorWithVehicleDto,
  ) {
    await this.authService.requireAdministrator(authorization);
    const profile = await this.registrationService.register(dto);
    return { message: 'Conductor y vehiculo registrados correctamente', data: profile };
  }
  @Patch(':id') async update(@Headers('authorization') authorization: string | undefined, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDriverProfileDto) { await this.authService.requireAdministrator(authorization); return this.registrationService.updateProfile(id, dto); }
  @Delete(':id') async remove(@Headers('authorization') authorization: string | undefined, @Param('id', ParseIntPipe) id: number) { await this.authService.requireAdministrator(authorization); return this.service.remove(id); }
}
@Controller('api/vehiculos')
export class VehiculosController {
  constructor(private readonly service: VehiculosService, private readonly authService: AuthService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findById(id); }
  @Post('foto')
  @UseInterceptors(FileInterceptor('foto', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadPhoto(
    @Headers('authorization') authorization: string | undefined,
    @UploadedFile() file?: { buffer: Buffer; mimetype: string; originalname: string },
  ) {
    await this.authService.requireAdministrator(authorization);
    if (!file) throw new BadRequestException('Selecciona una foto para subir.');
    const extensions: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
    const extension = extensions[file.mimetype] ?? extname(file.originalname).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(extension)) throw new BadRequestException('La foto debe ser JPG, PNG o WEBP.');
    const folder = join(process.cwd(), 'uploads', 'vehiculos');
    await mkdir(folder, { recursive: true });
    const filename = `${randomUUID()}${extension === '.jpeg' ? '.jpg' : extension}`;
    await writeFile(join(folder, filename), file.buffer);
    return { url: `/uploads/vehiculos/${filename}` };
  }
  @Post() create(@Body() dto: CreateVehiculoDto) { return this.service.create(dto); }
  @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateVehiculoDto) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
@Controller('api/tipos-documento')
export class TiposDocumentoController { constructor(private readonly service: TiposDocumentoService) {} @Get() findAll() { return this.service.findAll(); } @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findById(id); } @Post() create(@Body() dto: CreateTipoDocumentoDto) { return this.service.create(dto); } @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTipoDocumentoDto) { return this.service.update(id, dto); } @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); } }
@Controller('api/documentos')
export class DocumentosController { constructor(private readonly service: DocumentosService) {} @Get() findAll() { return this.service.findAll(); } @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findById(id); } @Post() create(@Body() dto: CreateDocumentoDto) { return this.service.create(dto); } @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDocumentoDto) { return this.service.update(id, dto); } @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); } }
@Controller('api/ubicaciones-conductor')
export class UbicacionesConductorController { constructor(private readonly service: UbicacionesConductorService) {} @Get() findAll() { return this.service.findAll(); } @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findById(id); } @Post() create(@Body() dto: CreateUbicacionConductorDto) { return this.service.create(dto); } @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUbicacionConductorDto) { return this.service.update(id, dto); } @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); } }
@Controller('api/ubicaciones-viaje')
export class UbicacionesViajeController { constructor(private readonly service: UbicacionesViajeService) {} @Get() findAll() { return this.service.findAll(); } @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findById(id); } @Post() create(@Body() dto: CreateUbicacionViajeDto) { return this.service.create(dto); } @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUbicacionViajeDto) { return this.service.update(id, dto); } @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); } }
@Controller('api/viajes')
export class ViajesController { constructor(private readonly service: ViajesService) {} @Get() findAll() { return this.service.findAll(); } @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findById(id); } @Post() create(@Body() dto: CreateViajeDto) { return this.service.create(dto); } @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateViajeDto) { return this.service.update(id, dto); } @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); } }
@Controller('api/solicitudes-viaje-conductor')
export class SolicitudesViajeConductorController { constructor(private readonly service: SolicitudesViajeConductorService) {} @Get() findAll() { return this.service.findAll(); } @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findById(id); } @Post() create(@Body() dto: CreateSolicitudViajeConductorDto) { return this.service.create(dto); } @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSolicitudViajeConductorDto) { return this.service.update(id, dto); } @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); } }
@Controller('api/calificaciones')
export class CalificacionesController { constructor(private readonly service: CalificacionesService) {} @Get() findAll() { return this.service.findAll(); } @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findById(id); } @Post() create(@Body() dto: CreateCalificacionDto) { return this.service.create(dto); } @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCalificacionDto) { return this.service.update(id, dto); } @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); } }
