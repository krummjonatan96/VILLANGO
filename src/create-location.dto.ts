import { Type } from 'class-transformer';
import { IsLatitude, IsLongitude, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLocationDto {
  @ApiProperty({ example: 'Bogota', description: 'Nombre de la ubicación' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 4.711, description: 'Latitud entre -90 y 90' })
  @Type(() => Number)
  @IsLatitude()
  latitude!: number;

  @ApiProperty({ example: -74.0721, description: 'Longitud entre -180 y 180' })
  @Type(() => Number)
  @IsLongitude()
  longitude!: number;
}