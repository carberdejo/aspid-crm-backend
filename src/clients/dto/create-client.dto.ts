import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateClientDto {
  @ApiProperty({
    description: 'Nombre comercial de la empresa',
    example: 'Andina Soluciones',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre comercial es obligatorio' })
  @MaxLength(100)
  commercialName: string;

  @ApiProperty({
    description: 'Razón social legal de la empresa',
    example: 'ANDINA SOLUCIONES GLOBALES S.A.C.',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'La razón social es obligatoria' })
  @MaxLength(100)
  businessName: string;

  @ApiProperty({
    description: 'Número de RUC único de la empresa',
    example: '20123456789',
    minLength: 11,
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty({ message: 'El RUC es obligatorio' })
  @MinLength(11, { message: 'El RUC debe tener al menos 11 dígitos' })
  @MaxLength(20)
  ruc: string;

  @ApiProperty({
    description: 'Dirección fiscal de la empresa',
    example: 'Av. Las Camelias 123, San Isidro',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: 'La dirección es obligatoria' })
  @MaxLength(255)
  address: string;

  @ApiProperty({
    description: 'Segmento industrial al que pertenece la empresa',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty({ message: 'El segmento industrial es obligatorio' })
  segmentId: number; // Nueva Llave Foránea

  @ApiProperty({
    description: 'Cartera a la que pertenece el cliente',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty({
    message: 'La cartera es obligatoria para el control de accesos',
  })
  portfolioId: number; // Nueva Llave Foránea

  @ApiProperty({
    description: 'Distrito donde se encuentra la empresa',
    example: 'San Isidro',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'El distrito es obligatorio' })
  @MaxLength(100)
  district: string; // Campo adicional para almacenar el distrito del cliente

  @ApiProperty({
    description: 'Provincia donde se encuentra la empresa',
    example: 'Lima',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'La provincia es obligatoria' })
  @MaxLength(100)
  province: string; // Campo adicional para almacenar la provincia del cliente

  @ApiProperty({
    description: 'Zona donde se encuentra la empresa',
    example: 'Norte',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'La zona es obligatoria' })
  @MaxLength(100)
  zone: string; // Campo adicional para almacenar el departamento del cliente
}
