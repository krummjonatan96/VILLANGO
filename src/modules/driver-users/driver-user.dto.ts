import { PartialType } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

const driverUserStatus = ['pendiente', 'en_revision', 'activo', 'suspendido', 'bloqueado'] as const;
const driverAvailability = ['offline', 'online', 'ocupado'] as const;

export class CreateDriverUserDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsString()
  @IsNotEmpty()
  apellido!: string;

  @IsString()
  @IsNotEmpty()
  celular!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsNotEmpty()
  numero_carnet!: string;

  @IsString()
  @IsNotEmpty()
  licencia_conducir!: string;

  @IsOptional()
  @IsDateString()
  fecha_vencimiento_licencia?: string;

  @IsOptional()
  @IsString()
  foto_perfil?: string;

  @IsOptional()
  @IsEnum(driverUserStatus)
  estado?: typeof driverUserStatus[number];

  @IsOptional()
  @IsEnum(driverAvailability)
  estado_disponibilidad?: typeof driverAvailability[number];
}

export class UpdateDriverUserDto extends PartialType(CreateDriverUserDto) {}

export class ChangeDriverUserStatusDto {
  @IsEnum(driverUserStatus)
  estado!: typeof driverUserStatus[number];
}

export class ChangeDriverAvailabilityDto {
  @IsEnum(driverAvailability)
  estado_disponibilidad!: typeof driverAvailability[number];
}
