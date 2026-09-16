import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min, MinLength, ValidateNested } from 'class-validator';

const availability = ['online', 'offline', 'ocupado'] as const;
const globalStatus = ['incompleto', 'en_verificacion', 'activo', 'suspendido', 'bloqueado'] as const;
const documentStatus = ['pendiente', 'en_revision', 'aprobado', 'rechazado'] as const;
const tripStatus = ['solicitado', 'asignado', 'en_camino', 'llego', 'iniciado', 'finalizado', 'cancelado'] as const;
const paymentMethods = ['efectivo', 'tarjeta'] as const;
const requestStatus = ['enviado', 'aceptado', 'rechazado', 'expirado'] as const;
const locationTypes = ['origen', 'destino'] as const;

export class RegisterVehicleDto {
  @IsString() @IsNotEmpty() placa!: string;
  @IsString() @IsNotEmpty() marca!: string;
  @IsString() @IsNotEmpty() modelo!: string;
  @IsString() @IsNotEmpty() color!: string;
}

export class RegisterConductorWithVehicleDto {
  @IsString() @IsNotEmpty() nombre_completo!: string;
  @IsString() @IsNotEmpty() numero_carnet!: string;
  @IsString() @IsNotEmpty() celular!: string;
  @IsString() @IsNotEmpty() usuario!: string;
  @IsString() @MinLength(8) password!: string;
  @IsString() @IsNotEmpty() numero_licencia!: string;
  @IsOptional() @IsString() foto_perfil?: string;
  @IsOptional() @ValidateNested() @Type(() => RegisterVehicleDto) vehiculo?: RegisterVehicleDto;
}

export class UpdateDriverLocationDto {
  @IsNumber() latitud!: number;
  @IsNumber() longitud!: number;
}

export class CreateConductorDto {
  @IsString() @IsNotEmpty() nombre!: string;
  @IsString() @IsNotEmpty() dni_ci!: string;
  @IsString() @IsNotEmpty() telefono!: string;
  @IsOptional() @IsString() foto_perfil?: string;
  @IsOptional() @IsEnum(availability) estado_disponibilidad?: typeof availability[number];
  @IsOptional() @IsEnum(globalStatus) estado_global?: typeof globalStatus[number];
  @IsOptional() @IsInt() vehiculo_activo_id?: number;
  @IsOptional() @IsInt() prioridad_asignacion?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(5) calificacion_promedio?: number;
  @IsOptional() @IsNumber() saldo_efectivo?: number;
  @IsOptional() @IsNumber() saldo_ganancias?: number;
}
export class UpdateConductorDto extends PartialType(CreateConductorDto) {}

export class UpdateDriverProfileDto {
  @IsOptional() @IsString() @IsNotEmpty() nombre_completo?: string;
  @IsOptional() @IsString() @IsNotEmpty() numero_carnet?: string;
  @IsOptional() @IsString() @IsNotEmpty() celular?: string;
  @IsOptional() @IsString() @IsNotEmpty() numero_licencia?: string;
  @IsOptional() @IsString() foto_perfil?: string;
  @IsOptional() @IsString() @IsNotEmpty() usuario?: string;
  @IsOptional() @IsString() @MinLength(8) password?: string;
}

export class CreateVehiculoDto {
  @IsInt() conductor_id!: number;
  @IsString() @IsNotEmpty() placa!: string;
  @IsString() @IsNotEmpty() marca!: string;
  @IsString() @IsNotEmpty() modelo!: string;
  @IsInt() anio!: number;
  @IsString() @IsNotEmpty() color!: string;
  @IsString() @IsNotEmpty() numero_chasis!: string;
  @IsString() @IsNotEmpty() numero_ruat!: string;
  @IsOptional() @IsString() foto_url?: string;
  @IsOptional() @IsBoolean() es_activo?: boolean;
}
export class UpdateVehiculoDto extends PartialType(CreateVehiculoDto) {}

export class CreateTipoDocumentoDto {
  @IsString() @IsNotEmpty() nombre!: string;
  @IsOptional() @IsBoolean() es_obligatorio?: boolean;
}
export class UpdateTipoDocumentoDto extends PartialType(CreateTipoDocumentoDto) {}

export class CreateDocumentoDto {
  @IsInt() conductor_id!: number;
  @IsInt() tipo_documento_id!: number;
  @IsString() @IsNotEmpty() url_archivo!: string;
  @IsOptional() @IsDateString() fecha_vencimiento?: string;
  @IsOptional() @IsEnum(documentStatus) estado?: typeof documentStatus[number];
  @IsOptional() @IsString() motivo_rechazo?: string;
}
export class UpdateDocumentoDto extends PartialType(CreateDocumentoDto) {}

export class CreateUbicacionConductorDto {
  @IsInt() conductor_id!: number;
  @IsNumber() latitud!: number;
  @IsNumber() longitud!: number;
}
export class UpdateUbicacionConductorDto extends PartialType(CreateUbicacionConductorDto) {}

export class CreateUbicacionViajeDto {
  @IsInt() viaje_id!: number;
  @IsEnum(locationTypes) tipo_ubicacion!: typeof locationTypes[number];
  @IsOptional() @IsString() direccion_texto?: string;
  @IsNumber() latitud!: number;
  @IsNumber() longitud!: number;
}
export class UpdateUbicacionViajeDto extends PartialType(CreateUbicacionViajeDto) {}

export class CreateViajeDto {
  @IsOptional() @IsInt() conductor_id?: number;
  @IsInt() pasajero_id!: number;
  @IsOptional() @IsEnum(tripStatus) estado?: typeof tripStatus[number];
  @IsOptional() @IsNumber() monto_total?: number;
  @IsOptional() @IsNumber() comision_plataforma?: number;
  @IsOptional() @IsNumber() ganancia_conductor?: number;
  @IsOptional() @IsEnum(paymentMethods) metodo_pago?: typeof paymentMethods[number];
  @IsOptional() @IsDateString() fecha_aceptado?: string;
  @IsOptional() @IsDateString() fecha_inicio?: string;
  @IsOptional() @IsDateString() fecha_fin?: string;
}
export class UpdateViajeDto extends PartialType(CreateViajeDto) {}

export class CreateSolicitudViajeConductorDto {
  @IsInt() viaje_id!: number;
  @IsInt() conductor_id!: number;
  @IsOptional() @IsEnum(requestStatus) estado?: typeof requestStatus[number];
}
export class UpdateSolicitudViajeConductorDto extends PartialType(CreateSolicitudViajeConductorDto) {}

export class CreateCalificacionDto {
  @IsInt() viaje_id!: number;
  @IsInt() conductor_id!: number;
  @IsInt() @Min(1) @Max(5) calificacion!: number;
  @IsOptional() @IsString() comentario?: string;
}
export class UpdateCalificacionDto extends PartialType(CreateCalificacionDto) {}
