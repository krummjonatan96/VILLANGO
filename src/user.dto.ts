import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'Juan' })
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @ApiProperty({ example: 'Perez' })
  @IsString()
  @IsNotEmpty()
  apellido!: string;

  @ApiProperty({ example: '3001234567' })
  @IsString()
  @IsNotEmpty()
  celular!: string;

  @ApiProperty({ example: 'Villango' })
  @IsString()
  @IsNotEmpty()
  empresa!: string;

  @ApiProperty({ example: 'CAR-001' })
  @IsString()
  @IsNotEmpty()
  numero_carnet!: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Juan Carlos' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nombre?: string;

  @ApiPropertyOptional({ example: 'Perez Gomez' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  apellido?: string;

  @ApiPropertyOptional({ example: '3009999999' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  celular?: string;

  @ApiPropertyOptional({ example: 'Nueva empresa' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  empresa?: string;

  @ApiPropertyOptional({ example: 'CAR-002' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  numero_carnet?: string;
}